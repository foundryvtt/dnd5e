import { convertLength } from "../utils.mjs";
import BasePlacement from "./api/base-placement.mjs";

/**
 * @import {
 *   TemplatePlacementConfiguration, TemplatePlacementData, TemplatePlacementShapeConfiguration
 * } from "./types.mjs";
 */

/**
 * Class responsible for placing templates onto the scene.
 * @extends BasePlacement<TemplatePlacementConfiguration, TemplatePlacementData>
 */
export default class TemplatePlacement extends BasePlacement {

  /* -------------------------------------------- */
  /*  Placement                                   */
  /* -------------------------------------------- */

  /** @override */
  async _place() {
    const results = [];
    const onKeyDown = this.#onKeyDown.bind(this);
    const priorTargets = this.config.targetOnPlacement ? new Set(Array.from(game.user.targets, t => t.id)) : null;
    window.addEventListener("keydown", onKeyDown, { capture: true });
    try {
      const region = await canvas.regions.placeRegion({
        name: RegionDocument.implementation.defaultName({ parent: canvas.scene }),
        color: this.config.color,
        displayMeasurements: true,
        highlightMode: "coverage",
        levels: [canvas.level.id],
        restriction: {
          enabled: true,
          type: "move"
        },
        shapes: this.config.shapes.map(s => this.#createShapeData(s)),
        "flags.core.MeasuredTemplate": true
      }, {
        // TODO: `attachToToken: true` if emanation
        create: false,
        onChange: this.config.targetOnPlacement ? ({ document }) => TemplatePlacement.#targetTokens([document]) : undefined,
        preConfirm: ({ document, index }) => {
          const obj = document.toObject();
          results.elevation = obj.elevation;
          results.push({ ...obj.shapes.at(-1) });
          // TODO: Set token ID if emanation attached to token
        }
      });
      if ( !region && priorTargets ) {
        canvas.tokens.setTargets(priorTargets);
        return [];
      }
      return results;
    } finally {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle template placement keyboard controls.
   * @param {KeyboardEvent} event  Triggering keydown event.
   */
  #onKeyDown(event) {
    if ( game.keyboard.hasFocus ) return;
    const context = game.keyboard.constructor.getKeyboardEventContext(event);
    const action = game.keyboard.constructor._getMatchingActions(context)
      .find(a => ["core.ascend", "core.descend"].includes(a.action));
    if ( !action ) return;
    const placement = canvas.regions._placementContext;
    if ( !placement ) return;

    const { preview, regionIndex, regionCount, shapes, shape, onChange } = placement;
    const document = preview.document;
    const shapeIndex = shape._index;
    const shapeCount = shapes.length;
    const delta = (action.action === "core.ascend" ? 1 : -1) * (event.shiftKey ? 1 : canvas.grid.distance);
    const elevation = {
      bottom: Number.isFinite(document.elevation.bottom) ? document.elevation.bottom + delta : null,
      top: Number.isFinite(document.elevation.top) ? document.elevation.top + delta : null
    };
    event.preventDefault();
    event.stopImmediatePropagation();
    const diff = document.updateSource({ elevation });
    if ( foundry.utils.isEmpty(diff) ) return;
    document.updateShapeConstraints();
    preview.renderFlags.set({ refreshShapes: true });
    if ( onChange ) onChange({ preview, document, regionIndex, regionCount, shape, shapeIndex, shapeCount });
  }

  /* -------------------------------------------- */

  /**
   * Create data for each shape using the standard config.
   * @param {TemplatePlacementShapeConfiguration} configuration
   * @returns {Partial<BaseShapeData>}
   */
  #createShapeData({ type, ...baseSizes }) {
    const gridMultiplier = canvas.scene.grid.size / canvas.scene.grid.distance;
    const size = baseSizes.size * gridMultiplier;
    const width = baseSizes.width * gridMultiplier;
    const data = { x: 0, y: 0, rotation: 0, type };
    switch ( type ) {
      case "circle": return { ...data, radius: size };
      case "cone": return { ...data, angle: CONFIG.MeasuredTemplate.defaults.angle, radius: size };
      case "emanation": return { base: { ...data }, radius: size }; // TODO: Make this work properly
      case "ray":
      case "line": return { ...data, length: size, width, type: "line" };
      case "rect":
      case "rectangle": return { ...data, width: size, height: size, type: "rectangle" };
      case "ring": return { ...data, radius: size, outerWidth: width };
    }
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * A factory method to create and place templates using provided data from an Activity instance.
   * @param {Activity} activity                    The Activity for which to construct the templates.
   * @param {object} [options={}]
   * @param {object} [options.createData={}]       Data to modify the template creation data.
   * @param {object} [options.placementConfig={}]  Modification to the placement configuration.
   * @returns {RegionDocument[]|null}  The template region documents, or null if activity doesn't have any defined.
   */
  static async fromActivity(activity, { createData={}, placementConfig={} }={}) {
    const target = activity.target?.template ?? {};
    const templateShape = dnd5e.config.areaTargetTypes[target.type]?.template;
    if ( !templateShape ) return null;

    const templateData = {
      type: templateShape,
      size: target.size
        ? convertLength(target.size, target.units, canvas.scene.grid.units, { strict: false }) : undefined,
      width: target.width
        ? convertLength(target.width, target.units, canvas.scene.grid.units, { strict: false }) : undefined,
      height: target.height
        ? convertLength(target.height, target.units, canvas.scene.grid.units, { strict: false }) : undefined
    };

    const config = foundry.utils.mergeObject({
      color: game.user.color,
      targetOnPlacement: target.targetOnPlacement,
      shapes: Array.fromRange(target.count || 1).map(() => foundry.utils.deepClone(templateData))
    }, placementConfig);

    /**
     * A hook event that fires before player is prompted for template placement.
     * @function dnd5e.preCreateMeasuredTemplate
     * @memberof hookEvents
     * @param {Activity} activity                               Activity for which the template is being placed.
     * @param {TemplatePlacementConfiguration} placementConfig  Configuration that drives template placement.
     * @returns {boolean}                                       Return `false` to prevent template placement.
     */
    if ( Hooks.call("dnd5e.preCreateMeasuredTemplate", activity, config) === false ) return null;

    const shapes = await TemplatePlacement.place(config);
    if ( !shapes?.length ) return null;

    // TODO: If type=emanation and stationary=false, create multiple templates
    // Otherwise only a single template is created with multiple shapes

    const rollData = activity.getRollData();
    const regionData = [foundry.utils.mergeObject({
      // TODO: Should the activity name be included?
      name: `${activity.item.name} [${game.user.name}]`,
      color: game.user.color,
      elevation: shapes.elevation,
      shapes: shapes.map(({ index, ...data }) => data),
      // TODO: Set elevation based on shape's height
      levels: [canvas.level.id],
      restriction: {
        enabled: true,
        // TODO: Is there a better setting to represent Total Cover?
        // TODO: What about templates like Fireball that flow around walls?
        type: "move"
      },
      // TODO: Set attachedToken if type=emanation and stationary=false and token clicked on
      visibility: CONST.REGION_VISIBILITY.ALWAYS,
      highlightMode: "coverage",
      flags: {
        dnd5e: {
          dimensions: {
            size: templateData.size,
            width: templateData.width,
            height: templateData.height,
            units: canvas.scene.grid.units
          },
          targetOnPlacement: target.targetOnPlacement,
          item: activity.item.uuid,
          origin: activity.uuid,
          spellLevel: rollData.item.level
        }
      }
    }, createData)];

    /**
     * A hook event that fires after templates have been placed by the player but before they have been created.
     * @function dnd5e.createMeasuredTemplate
     * @memberof hookEvents
     * @param {Activity} activity      Activity for which the template is being placed.
     * @param {object[]} templateData  Data for the regions to be created.
     * @returns {boolean}              Return `false` to prevent template creation.
     */
    if ( Hooks.call("dnd5e.createMeasuredTemplate", activity, regionData) === false ) return null;

    const created = await canvas.scene.createEmbeddedDocuments("Region", regionData);
    if ( target.targetOnPlacement ) TemplatePlacement.#targetTokens(created);

    /**
     * A hook event that fires after a template are created for an Activity.
     * @function dnd5e.postCreateMeasuredTemplate
     * @memberof hookEvents
     * @param {Activity} activity           Activity for which the template is being placed.
     * @param {RegionDocument[]} templates  The regions that were created.
     */
    Hooks.callAll("dnd5e.postCreateMeasuredTemplate", activity, created);

    return created;
  }

  /* -------------------------------------------- */

  /**
   * Target tokens inside created template regions.
   * @param {RegionDocument[]} regions  Created template regions.
   */
  static #targetTokens(regions) {
    const targetIds = new Set();
    for ( const region of regions ) {
      for ( const token of canvas.scene.tokens ) {
        if ( token.testInsideRegion(region) ) targetIds.add(token.id);
      }
    }
    canvas.tokens.setTargets(targetIds);
  }
}
