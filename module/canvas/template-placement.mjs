import { convertLength } from "../utils.mjs";

/**
 * @import {
 *   TemplatePlacementConfiguration, TemplatePlacementData, TemplatePlacementShapeConfiguration
 * } from "./types.mjs";
 */

/**
 * Class responsible for placing templates onto the scene.
 */
export default class TemplatePlacement {
  /**
   * Initialize the placement system using configuration information.
   * @param {TemplatePlacementConfiguration} config  Configuration information for placement.
   */
  constructor(config) {
    this.config = config;
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Configuration information for the placements.
   * @type {TemplatePlacementConfiguration}
   */
  config;

  /* -------------------------------------------- */
  /*  Placement                                   */
  /* -------------------------------------------- */

  /**
   * Perform the placement, asking player guidance when necessary.
   * @param {TemplatePlacementConfiguration} config
   * @returns {Promise<TemplatePlacementData[]>}
   */
  static place(config) {
    const placement = new this(config);
    return placement.place();
  }

  /**
   * Perform the placement, asking player guidance when necessary.
   * @returns {Promise<TemplatePlacementData[]>}
   */
  async place() {
    const activeLayer = canvas.activeLayer;
    try {
      const results = [];
      await canvas.regions.placeRegion({
        name: RegionDocument.implementation.defaultName({ parent: canvas.scene }),
        color: this.config.color,
        displayMeasurements: true,
        highlightMode: "coverage",
        shapes: this.config.shapes.map(s => this.#createShapeData(s)),
        "flags.core.MeasuredTemplate": true
      }, {
        // TODO: `attachToToken: true` if emanation
        create: false,
        preConfirm: ({ document, index }) => {
          const obj = document.toObject();
          results.push({ ...obj.shapes.at(-1) });
          // TODO: Set token ID if emanation attached to token
        }
      });
      return results;
    } finally {
      if ( activeLayer !== canvas.activeLayer ) activeLayer.activate();
    }
  }

  /* -------------------------------------------- */

  /**
   * Create data for each shape using the standard config.
   * @param {TemplatePlacementShapeConfiguration}
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
      size: convertLength(target.size, target.units, canvas.scene.grid.units, { strict: false }),
      width: convertLength(target.width, target.units, canvas.scene.grid.units, { strict: false }),
      height: convertLength(target.height, target.units, canvas.scene.grid.units, { strict: false })
    };

    const config = foundry.utils.mergeObject({
      color: game.user.color,
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

    const created = canvas.scene.createEmbeddedDocuments("Region", regionData);

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
}
