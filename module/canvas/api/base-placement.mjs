/**
 * @import { BasePlacementConfiguration, BasePlacementData } from "../types.mjs";
 */

/**
 * Class responsible for positioning one or more placeables onto the scene.
 * @template {BasePlacementConfiguration} [PlacementConfiguration=BasePlacementConfiguration]
 * @template {BasePlacementData} [PlacementData=BasePlacementData]
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

  /**
   * Layer into which this placeable type is rendered.
   * @type {CanvasLayer}
   * @abstract
   */
  static get placeableLayer() {
    throw new Error("Subclasses of BasePlacement must implement placeableLayer.");
  }

  get layer() {
    return this.constructor.placeableLayer;
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

  /**
   * Index of the placeable configuration currently being placed in the scene.
   * @param {number}
   */
  #currentPlacement = -1;

  /* -------------------------------------------- */

  /**
   * Track the bound event handlers so they can be properly canceled later.
   * @type {object}
   */
  #events;

  /* -------------------------------------------- */

  /**
   * Track the timestamp when the last mouse move event was captured.
   * @type {number}
   */
  #moveTime = 0;

  /* -------------------------------------------- */

  /**
   * Individual placement configuration data.
   * @type {object[]}
   * @protected
   */
  get _placementConfigs() {
    return this.config.placements;
  }

  /* -------------------------------------------- */

  /**
   * Placements that have been generated.
   * @type {PlacementData[]}
   */
  #placements = [];

  /* -------------------------------------------- */

  /**
   * Preview placeables. Should match 1-to-1 with placements.
   * @type {PlaceableObject[]}
   */
  #previews = [];

  /* -------------------------------------------- */

  /**
   * Is the system currently being throttled to the next animation frame?
   * @type {boolean}
   */
  #throttle = false;

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
    this.#createPreviews();
    try {
      const placements = [];
      let total = 0;
      const uniquePlacements = new Map();
      while ( this.#currentPlacement < this._placementConfigs.length - 1 ) {
        this.#currentPlacement++;
        const obj = this.layer.preview.addChild(this.#previews[this.#currentPlacement].object);
        await obj.draw();
        obj.eventMode = "none";
        const placement = await this.#requestPlacement();
        if ( placement ) {
          const uniqueId = this._getUniqueId(placement);
          uniquePlacements.set(uniqueId, (uniquePlacements.get(uniqueId) ?? -1) + 1);
          placement.index = { total: total++, unique: uniquePlacements.get(uniqueId) };
          placements.push(placement);
        } else obj.destroy({ children: true });
      }
      return placements;
    } finally {
      this.#destroyPreviews();
    }
  }

  /* -------------------------------------------- */

  /**
   * Create previews based on the prototype tokens in config.
   */
  #createPreviews() {
    for ( const placementConfig of this._placementConfigs ) {
      const placement = this._createPlacementData(placementConfig);
      this.#placements.push(placement);
      const cls = getDocumentClass(this.layer.constructor.documentName);
      const preview = new cls(this._createPreviewData(placementConfig, placement), { parent: canvas.scene });
      preview.object._previewType ??= "creation";
      this.#previews.push(preview);
    }
  }

  /* -------------------------------------------- */

  /**
   * Create initial placement data from a single placement configuration.
   * @param {object} placementConfig  Configuration data for an individual placement.
   * @returns {PlacementData}
   * @protected
   */
  _createPlacementData(placementConfig) {
    return foundry.utils.deepClone(placementConfig);
  }

  /* -------------------------------------------- */

  /**
   * Prepare the data used to create the preview in the scene.
   * @param {object} placementConfig       Configuration data for an individual placement.
   * @param {PlacementData} placementData  Initial placement data.
   * @returns {object}
   * @protected
   */
  _createPreviewData(placementConfig, placementData) {
    return foundry.utils.deepClone(placementConfig);
  }

  /* -------------------------------------------- */

  /**
   * Clear any previews from the scene.
   */
  #destroyPreviews() {
    this.#previews.forEach(p => {
      if ( p.object && !p.object.destroyed ) p.object.destroy({ children: true });
    });
  }

  /* -------------------------------------------- */

  /**
   * Retrieve ID used to distinguish unique placements.
   * @param {PlacementData} placementData  Data for the placement.
   * @returns {*}
   * @protected
   */
  _getUniqueId(placementData) {
    return null;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Activate listeners for the placement preview.
   * @returns {Promise<PlacementData|false>}  A promise that resolves with the final placement if created,
   *                                          or false if the placement was skipped.
   */
  #requestPlacement() {
    return new Promise((resolve, reject) => {
      this.#events = {
        down: this.#onPointerDown.bind(this),
        move: this.#onMovePlacement.bind(this),
        resolve,
        reject,
        rotate: this.#onRotatePlacement.bind(this)
      };

      // Activate listeners
      canvas.stage.on("pointermove", this.#events.move);
      canvas.stage.on("pointerdown", this.#events.down);
      canvas.app.view.onwheel = this.#events.rotate;
    });
  }

  /* -------------------------------------------- */

  /**
   * Shared code for when placement ends by being confirmed or canceled.
   * @param {Event} event  Triggering event that ended the placement.
   */
  #finishPlacement(event) {
    canvas.stage.off("pointermove", this.#events.move);
    canvas.stage.off("pointerdown", this.#events.down);
    canvas.app.view.onwheel = null;
  }

  /* -------------------------------------------- */

  /**
   * Move the preview when the mouse moves.
   * @param {PointerEvent} event  Triggering mouse event.
   */
  #onMovePlacement(event) {
    event.stopPropagation();
    if ( this.#throttle ) return;
    this.#throttle = true;
    this._onMovePlacement(event, this.#previews[this.#currentPlacement], this.#placements[this.#currentPlacement]);
    this.#previews[this.#currentPlacement].object.refresh();
    requestAnimationFrame(() => this.#throttle = false);
  }

  /* -------------------------------------------- */

  /**
   * Handle updating the preview and placement position based on mouse movement.
   * @param {PointerEvent} event       Triggering mouse event.
   * @param {CanvasDocument} preview   The preview document.
   * @param {PlacementData} placement  Data for the placement to update.
   * @protected
   */
  _onMovePlacement(event, preview, placement) {
    const local = event.data.getLocalPosition(this.layer);
    local.x = local.x - (preview.object.w / 2);
    local.y = local.y - (preview.object.h / 2);
    const dest = !event.shiftKey ? preview.object.getSnappedPosition(local) : local;
    preview.updateSource({ x: dest.x, y: dest.y });
    placement.x = preview.x;
    placement.y = preview.y;
  }

  /* -------------------------------------------- */

  /**
   * Handle mouse clicks on the canvas.
   * @param {PointerEvent} event  Triggering mouse event.
   */
  #onPointerDown(event) {
    if ( event.button === 0 ) this.#onConfirmPlacement(event);
    else this.#onSkipPlacement(event);
  }

  /* -------------------------------------------- */

  /**
   * Rotate the preview by 3˚ increments when the mouse wheel is rotated.
   * @param {PointEvent} event  Triggering mouse event.
   */
  #onRotatePlacement(event) {
    if ( event.ctrlKey ) event.preventDefault(); // Avoid zooming the browser window
    event.stopPropagation();
    this._onRotatePlacement(event, this.#previews[this.#currentPlacement], this.#placements[this.#currentPlacement]);
    this.#previews[this.#currentPlacement].object.refresh();
  }

  /* -------------------------------------------- */

  /**
   * Handle updating the preview and placement rotation based on mouse wheel.
   * @param {PointerEvent} event       Triggering mouse event.
   * @param {CanvasDocument} preview   The preview document.
   * @param {PlacementData} placement  Data for the placement to update.
   * @protected
   */
  _onRotatePlacement(event, preview, placement) {
    const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
    const snap = event.shiftKey ? delta : 5;
    placement.rotation += snap * Math.sign(event.deltaY);
    preview.updateSource({ rotation: placement.rotation });
  }

  /* -------------------------------------------- */

  /**
   * Confirm placement when the left mouse button is clicked.
   * @param {PointerEvent} event  Triggering mouse event.
   */
  #onConfirmPlacement(event) {
    this.#finishPlacement(event);
    this._onConfirmPlacement(event, this.#previews[this.#currentPlacement], this.#placements[this.#currentPlacement]);
    this.#events.resolve(this.#placements[this.#currentPlacement]);
  }

  /* -------------------------------------------- */

  /**
   * Handle any actions required when placement is confirmed.
   * @param {PointerEvent} event       Triggering mouse event.
   * @param {CanvasDocument} preview   The preview document.
   * @param {PlacementData} placement  Data for the finished placement.
   * @protected
   */
  _onConfirmPlacement(event, preview, placement) {}

  /* -------------------------------------------- */

  /**
   * Skip placement when the right mouse button is clicked.
   * @param {PointerEvent} event  Triggering mouse event.
   */
  #onSkipPlacement(event) {
    this.#finishPlacement(event);
    this._onSkipPlacement(event, this.#previews[this.#currentPlacement], this.#placements[this.#currentPlacement]);
    this.#events.resolve(false);
  }

  /* -------------------------------------------- */

  /**
   * Handle any actions required when placement is skipped.
   * @param {PointerEvent} event       Triggering mouse event.
   * @param {CanvasDocument} preview   The preview document.
   * @param {PlacementData} placement  Data for the finished placement.
   * @protected
   */
  _onSkipPlacement(event, preview, placement) {}
}
