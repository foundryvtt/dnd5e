/**
 * Configuration information for a token placement operation.
 *
 * @typedef {object} TokenPlacementConfiguration
 * @property {PrototypeToken[]} tokens  Prototype token information for rendering.
 */

/**
 * Data for token placement on the scene.
 *
 * @typedef {object} PlacementData
 * @property {PrototypeToken} prototypeToken
 * @property {object} index
 * @property {number} index.total             Index of the placement across all placements.
 * @property {number} index.unique            Index of the placement across placements with the same original token.
 * @property {number} x
 * @property {number} y
 * @property {number} rotation
 */

/**
 * Class responsible for placing one or more tokens onto the scene.
 * @param {TokenPlacementConfiguration} config  Configuration information for placement.
 */
export default class TokenPlacement {
  constructor(config) {
    this.config = config;
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Configuration information for the placements.
   * @type {TokenPlacementConfiguration}
   */
  config;

  /* -------------------------------------------- */

  /**
   * Index of the token configuration currently being placed in the scene.
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
   * Placements that have been generated.
   * @type {PlacementData[]}
   */
  #placements;

  /* -------------------------------------------- */

  /**
   * Preview tokens. Should match 1-to-1 with placements.
   * @type {Token[]}
   */
  #previews;

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
   * @param {TokenPlacementConfiguration} config
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
      const uniqueTokens = new Map();
      while ( this.#currentPlacement < this.config.tokens.length - 1 ) {
        this.#currentPlacement++;
        const obj = canvas.tokens.preview.addChild(this.#previews[this.#currentPlacement].object);
        await obj.draw();
        obj.eventMode = "none";
        const placement = await this.#requestPlacement();
        if ( placement ) {
          const actorId = placement.prototypeToken.parent.id;
          uniqueTokens.set(actorId, (uniqueTokens.get(actorId) ?? -1) + 1);
          placement.index = { total: total++, unique: uniqueTokens.get(actorId) };
          placements.push(placement);
        } else obj.clear();
      }
      return placements;
    } finally {
      this.#destroyPreviews();
    }
  }

  /* -------------------------------------------- */

  /**
   * Create token previews based on the prototype tokens in config.
   */
  #createPreviews() {
    this.#placements = [];
    this.#previews = [];
    for ( const prototypeToken of this.config.tokens ) {
      const tokenData = prototypeToken.toObject();
      tokenData.sight.enabled = false;
      tokenData._id = foundry.utils.randomID();
      if ( tokenData.randomImg ) tokenData.texture.src = prototypeToken.actor.img;
      const cls = getDocumentClass("Token");
      const doc = new cls(tokenData, { parent: canvas.scene });
      this.#placements.push({ prototypeToken, x: 0, y: 0, rotation: tokenData.rotation ?? 0 });
      this.#previews.push(doc);
    }
  }

  /* -------------------------------------------- */

  /**
   * Clear any previews from the scene.
   */
  #destroyPreviews() {
    this.#previews.forEach(p => p.object.destroy());
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
        confirm: this.#onConfirmPlacement.bind(this),
        move: this.#onMovePlacement.bind(this),
        resolve,
        reject,
        rotate: this.#onRotatePlacement.bind(this),
        skip: this.#onSkipPlacement.bind(this)
      };

      // Activate listeners
      canvas.stage.on("mousemove", this.#events.move);
      canvas.stage.on("mousedown", this.#events.confirm);
      canvas.app.view.oncontextmenu = this.#events.skip;
      canvas.app.view.onwheel = this.#events.rotate;
    });
  }

  /* -------------------------------------------- */

  /**
   * Shared code for when token placement ends by being confirmed or canceled.
   * @param {Event} event  Triggering event that ended the placement.
   */
  async #finishPlacement(event) {
    canvas.stage.off("mousemove", this.#events.move);
    canvas.stage.off("mousedown", this.#events.confirm);
    canvas.app.view.oncontextmenu = null;
    canvas.app.view.onwheel = null;
  }

  /* -------------------------------------------- */

  /**
   * Move the token preview when the mouse moves.
   * @param {Event} event  Triggering mouse event.
   */
  #onMovePlacement(event) {
    event.stopPropagation();
    if ( this.#throttle ) return;
    this.#throttle = true;
    const idx = this.#currentPlacement;
    const preview = this.#previews[idx];
    const clone = preview.object;
    const local = event.data.getLocalPosition(canvas.tokens);
    local.x = local.x - (clone.w / 2);
    local.y = local.y - (clone.h / 2);
    const dest = !event.shiftKey ? clone.getSnappedPosition(local) : local;
    preview.updateSource({x: dest.x, y: dest.y});
    this.#placements[idx].x = preview.x;
    this.#placements[idx].y = preview.y;
    canvas.tokens.preview.children[this.#currentPlacement]?.refresh();
    requestAnimationFrame(() => this.#throttle = false);
  }

  /* -------------------------------------------- */

  /**
   * Rotate the token preview by 3˚ increments when the mouse wheel is rotated.
   * @param {Event} event  Triggering mouse event.
   */
  #onRotatePlacement(event) {
    if ( event.ctrlKey ) event.preventDefault(); // Avoid zooming the browser window
    event.stopPropagation();
    const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
    const snap = event.shiftKey ? delta : 5;
    const preview = this.#previews[this.#currentPlacement];
    this.#placements[this.#currentPlacement].rotation += snap * Math.sign(event.deltaY);
    preview.updateSource({ rotation: this.#placements[this.#currentPlacement].rotation });
    canvas.tokens.preview.children[this.#currentPlacement]?.refresh();
  }

  /* -------------------------------------------- */

  /**
   * Confirm placement when the left mouse button is clicked.
   * @param {Event} event  Triggering mouse event.
   */
  async #onConfirmPlacement(event) {
    await this.#finishPlacement(event);
    this.#events.resolve(this.#placements[this.#currentPlacement]);
  }

  /* -------------------------------------------- */

  /**
   * Skip placement when the right mouse button is clicked.
   * @param {Event} event  Triggering mouse event.
   */
  async #onSkipPlacement(event) {
    await this.#finishPlacement(event);
    this.#events.resolve(false);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Adjust the appended number on an unlinked token to account for multiple placements.
   * @param {TokenDocument|object} tokenDocument  Document or data object to adjust.
   * @param {PlacementData} placement             Placement data associated with this token document.
   */
  static adjustAppendedNumber(tokenDocument, placement) {
    const regex = new RegExp(/\((\d+)\)$/);
    const match = tokenDocument.name?.match(regex);
    if ( !match ) return;
    const name = tokenDocument.name.replace(regex, `(${Number(match[1]) + placement.index.unique})`);
    if ( tokenDocument instanceof TokenDocument ) tokenDocument.updateSource({ name });
    else tokenDocument.name = name;
  }
}
