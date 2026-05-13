/**
 * @import { BasePlacementConfiguration } from "../_types.mjs";
 */

/**
 * Abstract base class that handles placing objects into the scene.
 * @template {BasePlacementConfiguration} [PlacementConfiguration]
 * @template {object} [PlacementData]
 */
export default class BasePlacement {
  /**
   * Initialize the placement system using configuration information.
   * @param {PlacementConfiguration} config  Configuration information for placement.
   */
  constructor(config) {
    this.config = config;
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Configuration information for the placements.
   * @type {PlacementConfiguration}
   */
  config;

  /* -------------------------------------------- */
  /*  Placement                                   */
  /* -------------------------------------------- */

  /**
   * Perform the placement, asking player guidance when necessary.
   * @param {PlacementConfiguration} config
   * @returns {Promise<PlacementData[]>}
   */
  static place(config) {
    const placement = new this(config);
    return placement.place();
  }

  /**
   * Perform the placement, asking player guidance when necessary.
   * @returns {Promise<PlacementData[]>}
   */
  async place() {
    const activeLayer = canvas.activeLayer;
    const minimizedApplications = this.config.minimizeWindows !== false
      ? Array.from(foundry.applications.instances.values()
        .filter(a => a.rendered && a.hasFrame && !a.minimized && !a.window.windowId))
      : [];
    await Promise.all(minimizedApplications.map(a => a.minimize()));
    try {
      return await this._place();
    } finally {
      if ( (this.config.restoreLayer !== false) && (activeLayer !== canvas.activeLayer) ) activeLayer.activate();
      await Promise.all(minimizedApplications.map(a => a.maximize()));
    }
  }

  /**
   * Internal method that handles specific placement details.
   * @returns {Promise<PlacementData[]>}
   * @abstract
   * @protected
   */
  async _place() {
    throw new Error("Subclasses of BasePlacement must implement a `_place` method.");
  }
}
