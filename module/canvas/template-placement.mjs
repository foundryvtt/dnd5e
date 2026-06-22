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
        elevation: this.#getInitialElevation(),
        highlightMode: "coverage",
        levels: [canvas.level.id],
        restriction: {
          enabled: true,
          type: "move"
        },
        shapes: this.config.shapes.map(s => this.#createShapeData(s)),
        flags: {
          core: { MeasuredTemplate: true },
          dnd5e: { dimensions: this.#getDimensionsData() }
        }
      }, {
        // TODO: `attachToToken: true` if emanation
        create: false,
        onChange: ({ preview, document }) => {
          TemplatePlacement.#displayTemplateElevation(preview);
          if ( this.config.targetOnPlacement ) TemplatePlacement.#targetTokens([document]);
        },
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
    const base = this.#getInitialElevation();
    const elevation = {
      bottom: (Number.isFinite(document.elevation.bottom) ? document.elevation.bottom : base.bottom) + delta,
      top: (Number.isFinite(document.elevation.top) ? document.elevation.top : base.top) + delta
    };
    event.preventDefault();
    event.stopImmediatePropagation();
    const diff = document.updateSource({ elevation });
    if ( foundry.utils.isEmpty(diff) ) return;
    document.updateShapeConstraints();
    preview.renderFlags.set({ refreshShapes: true, refreshMeasurements: true });
    if ( onChange ) onChange({ preview, document, regionIndex, regionCount, shape, shapeIndex, shapeCount });
  }

  /* -------------------------------------------- */

  /**
   * Get the initial elevation range for the template.
   * @returns {{bottom: number|null, top: number|null}}
   */
  #getInitialElevation() {
    const origin = this.config.origin;
    if ( !origin ) return foundry.utils.deepClone(canvas.level.elevation);
    const size = this.config.shapes?.[0]?.size;
    if ( this.config.targetType === "cube" && Number.isFinite(size) ) {
      return {
        bottom: origin.elevation,
        top: origin.elevation + size
      };
    }
    if ( this.config.targetType === "sphere" && Number.isFinite(size) ) {
      return {
        bottom: origin.elevation - size,
        top: origin.elevation + size
      };
    }
    if ( this.config.targetType === "cone" && Number.isFinite(size) ) {
      const height = size * Math.tan(Math.toRadians(CONFIG.MeasuredTemplate.defaults.angle / 2));
      return {
        bottom: origin.elevation - height,
        top: origin.elevation + height
      };
    }
    return {
      bottom: origin.elevation,
      top: origin.elevation + ((origin.depth ?? 1) * canvas.grid.distance)
    };
  }

  /* -------------------------------------------- */

  /**
   * Get dimensions data for the template.
   * @returns {object}
   */
  #getDimensionsData() {
    const shape = this.config.shapes?.[0] ?? {};
    return {
      type: this.config.targetType,
      size: shape.size,
      width: shape.width,
      height: shape.height,
      units: canvas.scene.grid.units
    };
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
      origin: activity.getUsageToken?.(),
      targetType: target.type,
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
            type: target.type,
            size: templateData.size,
            width: templateData.width,
            height: templateData.height,
            centerElevation: ["cone", "sphere"].includes(target.type)
              ? ((shapes.elevation.bottom + shapes.elevation.top) / 2) : undefined,
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
        if ( TemplatePlacement.#testInsideTemplateRegion(token, region) ) targetIds.add(token.id);
      }
    }
    canvas.tokens.setTargets(targetIds);
  }

  /* -------------------------------------------- */

  /**
   * Display the template elevation alongside the measured distance.
   * @param {Region} preview  Preview region object.
   */
  static #displayTemplateElevation(preview) {
    if ( preview._dnd5eFormatMeasuredDistance ) return;
    preview._dnd5eFormatMeasuredDistance = preview._formatMeasuredDistance.bind(preview);
    preview._formatMeasuredDistance = distance => {
      const text = preview._dnd5eFormatMeasuredDistance(distance);
      const elevation = preview.document.elevation.bottom;
      if ( !Number.isFinite(elevation) ) return text;
      const formattedElevation = elevation.toNearest(0.01).toLocaleString(game.i18n.lang);
      const units = canvas.grid.units;
      return `${text} (${formattedElevation}${units ? ` ${units}` : ""})`;
    };
  }

  /* -------------------------------------------- */

  /**
   * Test whether a token is inside a template region, accounting for 3D area shapes.
   * @param {TokenDocument} token   Token being tested.
   * @param {RegionDocument} region Template region being tested.
   * @returns {boolean}
   */
  static #testInsideTemplateRegion(token, region) {
    if ( !token.testInsideRegion(region) && !TemplatePlacement.#sharesTemplateGridSpace(token, region) ) return false;
    const dimensions = region.flags.dnd5e?.dimensions;
    if ( !["cone", "cube", "sphere"].includes(dimensions?.type) ) return true;

    const shape = region.shapes.find(s => ["circle", "cone", "rectangle"].includes(s.type));
    if ( !shape ) return true;
    const tokenSize = token.getSize();
    if ( dimensions.type === "cube" ) {
      const x = Math.max(shape.x, token.x);
      const y = Math.max(shape.y, token.y);
      const z = Math.max(region.elevation.bottom, token.elevation);
      const right = Math.min(shape.x + shape.width, token.x + tokenSize.width);
      const bottom = Math.min(shape.y + shape.height, token.y + tokenSize.height);
      const top = Math.min(region.elevation.bottom + dimensions.size, token.elevation + (token.depth * canvas.grid.distance));
      return (x < right) && (y < bottom) && (z < top);
    }
    if ( dimensions.type === "cone" ) {
      const gridMultiplier = canvas.scene.grid.size / canvas.scene.grid.distance;
      const centerElevation = dimensions.centerElevation ?? region.elevation.bottom;
      const direction = Math.toRadians(shape.rotation);
      const axis = { x: Math.cos(direction), y: Math.sin(direction) };
      const halfAngle = Math.toRadians(shape.angle / 2);
      const tokenTop = token.elevation + (token.depth * canvas.grid.distance);
      const points = [
        [token.x, token.y, token.elevation],
        [token.x + tokenSize.width, token.y, token.elevation],
        [token.x + tokenSize.width, token.y + tokenSize.height, token.elevation],
        [token.x, token.y + tokenSize.height, token.elevation],
        [token.x, token.y, tokenTop],
        [token.x + tokenSize.width, token.y, tokenTop],
        [token.x + tokenSize.width, token.y + tokenSize.height, tokenTop],
        [token.x, token.y + tokenSize.height, tokenTop],
        [token.x + (tokenSize.width / 2), token.y + (tokenSize.height / 2), (token.elevation + tokenTop) / 2]
      ];
      return points.some(([x, y, elevation]) => {
        const dx = (x - shape.x) / gridMultiplier;
        const dy = (y - shape.y) / gridMultiplier;
        const dz = elevation - centerElevation;
        const distance = (dx * axis.x) + (dy * axis.y);
        if ( (distance < 0) || (distance > dimensions.size) ) return false;
        const radius = distance * Math.tan(halfAngle);
        const perpendicular = Math.hypot(dx - (distance * axis.x), dy - (distance * axis.y), dz);
        return perpendicular <= radius;
      });
    }

    const gridMultiplier = canvas.scene.grid.size / canvas.scene.grid.distance;
    const point = {
      x: Math.clamp(shape.x, token.x, token.x + tokenSize.width),
      y: Math.clamp(shape.y, token.y, token.y + tokenSize.height),
      elevation: Math.clamp(dimensions.centerElevation ?? region.elevation.bottom, token.elevation,
        token.elevation + (token.depth * canvas.grid.distance))
    };
    const dx = (point.x - shape.x) / gridMultiplier;
    const dy = (point.y - shape.y) / gridMultiplier;
    const dz = point.elevation - (dimensions.centerElevation ?? region.elevation.bottom);
    return Math.hypot(dx, dy, dz) <= dimensions.size;
  }

  /* -------------------------------------------- */

  /**
   * Test whether a token shares an affected grid space with a template region.
   * @param {TokenDocument} token   Token being tested.
   * @param {RegionDocument} region Template region being tested.
   * @returns {boolean}
   */
  static #sharesTemplateGridSpace(token, region) {
    if ( canvas.grid.isGridless ) return false;
    if ( !region.testPoint({ x: token.x, y: token.y, elevation: token.elevation }, 0.75) ) {
      const top = token.elevation + (token.depth * canvas.grid.distance);
      if ( (top <= region.elevation.bottom) || (token.elevation >= region.elevation.top) ) return false;
    }

    const polygonTree = region.object?.animationState?.polygonTree ?? region.polygonTree;
    const sharedGridSpaces = game.settings.get("dnd5e", "targetTemplateGridSpaces");
    for ( const offset of token.getOccupiedGridSpaceOffsets(token._source) ) {
      const center = canvas.grid.getCenterPoint(offset);
      center.x = Math.round(center.x - (canvas.grid.sizeX / 2)) + (canvas.grid.sizeX / 2);
      center.y = Math.round(center.y - (canvas.grid.sizeY / 2)) + (canvas.grid.sizeY / 2);
      if ( polygonTree.testPoint(center, 0.75) ) return true;
      if ( !sharedGridSpaces ) continue;

      const topLeft = canvas.grid.getTopLeftPoint(offset);
      const points = [
        { x: topLeft.x, y: topLeft.y },
        { x: topLeft.x + canvas.grid.sizeX, y: topLeft.y },
        { x: topLeft.x + canvas.grid.sizeX, y: topLeft.y + canvas.grid.sizeY },
        { x: topLeft.x, y: topLeft.y + canvas.grid.sizeY }
      ];
      if ( points.some(point => polygonTree.testPoint(point, 0.75)) ) return true;
    }
    return false;
  }
}
