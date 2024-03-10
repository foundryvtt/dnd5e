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
  /*  Placement                                   */
  /* -------------------------------------------- */

  /**
   * Perform the placement, asking player guidance when necessary.
   * @returns {PlacementData[]}
   */
  async place() {
    const template = TokenPlacementTemplate.create(this.config);
    const placement = await template.place();
    return placement;
  }
}


/**
 * A MeasuredTemplate used to visualize token placement in the scene.
 */
export class TokenPlacementTemplate extends MeasuredTemplate {

  /**
   * Configuration information for this placement.
   * @type {TokenPlacementConfiguration}
   */
  config;

  /* -------------------------------------------- */

  /**
   * Track the bound event handlers so they can be properly canceled later.
   * @type {object}
   */
  #events;

  /* -------------------------------------------- */

  /**
   * The initially active CanvasLayer to re-activate after the workflow is complete.
   * @type {CanvasLayer}
   */
  #initialLayer;

  /**
   * Placements that have been generated.
   * @type {PlacementData[]}
   */
  placements;

  /* -------------------------------------------- */

  /**
   * Track the timestamp when the last mouse move event was captured.
   * @type {number}
   */
  #moveTime = 0;

  /* -------------------------------------------- */

  /**
   * Determine whether the throttling period has passed. Set to `true` to reset period.
   * @type {boolean}
   */
  get throttle() {
    return Date.now() - this.#moveTime <= 20;
  }

  set throttle(value) {
    this.#moveTime = Date.now();
  }

  /* -------------------------------------------- */

  /**
   * A factory method to create an AbilityTemplate instance using provided data from an Item5e instance
   * @param {TokenPlacementConfiguration} config  Configuration data for the token placement.
   * @param {object} [options={}]                 Options to modify the created template.
   * @returns {TokenPlacementTemplate}            The template object.
   */
  static create(config, options={}) {
    const templateData = foundry.utils.mergeObject({
      t: "ray", user: game.user.id, distance: config.tokens[0].width, width: config.tokens[0].height
    }, options);

    const cls = getDocumentClass("MeasuredTemplate");
    const template = new cls(templateData, {parent: canvas.scene});
    const object = new this(template);
    object.config = config;
    object.placements = [{x: 0, y: 0, rotation: 0}];

    return object;
  }

  /* -------------------------------------------- */

  /**
   * Creates a preview of the token placement template.
   * @returns {Promise<PlacementData[]>}  A promise that resolves with the final token position if completed.
   */
  place() {
    const initialLayer = canvas.activeLayer;

    // Draw the template and switch to the template layer
    this.draw();
    this.layer.activate();
    this.layer.preview.addChild(this);

    // Activate interactivity
    return this.activatePreviewListeners(initialLayer);
  }

  /* -------------------------------------------- */
  /*  Drawing                                     */
  /* -------------------------------------------- */

  /** @override */
  async _draw() {

    // Load Fill Texture
    if ( this.document.texture ) await loadTexture(this.document.texture, {fallback: "icons/svg/hazard.svg"});
    this.texture = null;

    // Template Shape
    this.template = this.addChild(new PIXI.Graphics());

    // Token Icon
    this.controlIcon = this.addChild(this.#createTokenIcon());
    await this.controlIcon.draw();

    // Ruler Text
    this.ruler = this.addChild(this.#drawRulerText());

    // Enable highlighting for this template
    canvas.grid.addHighlightLayer(this.highlightId);
  }

  /* -------------------------------------------- */

  /**
   * Draw the ControlIcon for the MeasuredTemplate
   * @returns {ControlIcon}
   */
  #createTokenIcon() {
    let icon = new TokenIcon({
      texture: this.config.tokens[0].randomImg ? this.config.tokens[0].actor.img : this.config.tokens[0].texture.src,
      angle: this.document.direction,
      scale: { x: this.config.tokens[0].texture.scaleX, y: this.config.tokens[0].texture.scaleY },
      width: this.config.tokens[0].width * canvas.dimensions.size,
      height: this.config.tokens[0].height * canvas.dimensions.size
    });
    icon.x -= this.config.tokens[0].width * 0.5;
    icon.y -= this.config.tokens[0].height * 0.5;
    return icon;
  }

  /* -------------------------------------------- */

  /**
   * Draw the Text label used for the MeasuredTemplate
   * @returns {PreciseText}
   */
  #drawRulerText() {
    const style = CONFIG.canvasTextStyle.clone();
    style.fontSize = Math.max(Math.round(canvas.dimensions.size * 0.36 * 12) / 12, 36);
    const text = new PreciseText(null, style);
    text.anchor.set(0, 1);
    return text;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _applyRenderFlags(flags) {
    this.controlIcon.angle = this.document.direction;
    super._applyRenderFlags(flags);

    // Hide unnecessary elements
    const highlightLayer = canvas.grid.getHighlightLayer(this.highlightId);
    highlightLayer.visible = false;
    this.ruler.visible = false;
    this.template.visible = false;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Pixel offset to ensure snapping occurs in middle of grid space.
   * @type {{x: number, y: number}}
   */
  get snapAdjustment() {
    const size = canvas.dimensions.size;
    switch ( canvas.grid.type ) {
      case CONST.GRID_TYPES.SQUARE:
        return {
          x: this.config.tokens[0].width % 2 === 0 ? Math.round(size * 0.5) : 0,
          y: this.config.tokens[0].height % 2 === 0 ? Math.round(size * 0.5) : 0
        };
      default:
        return { x: 0, y: 0 };
    }
  }

  /* -------------------------------------------- */

  /**
   * Interval for snapping token to the grid.
   * @type {number}
   */
  get snapInterval() {
    // TODO: Figure out proper snapping sized based on token size
    return canvas.grid.type === CONST.GRID_TYPES.GRIDLESS ? 0
      : Math.max(this.config.tokens[0].width, this.config.tokens[0].height) > 0.5 ? 1 : 2;
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for the template preview
   * @param {CanvasLayer} initialLayer  The initially active CanvasLayer to re-activate after the workflow is complete
   * @returns {Promise}                 A promise that resolves with the final measured template if created.
   */
  activatePreviewListeners(initialLayer) {
    return new Promise((resolve, reject) => {
      this.#initialLayer = initialLayer;
      this.#events = {
        cancel: this._onCancelPlacement.bind(this),
        confirm: this._onConfirmPlacement.bind(this),
        move: this._onMovePlacement.bind(this),
        resolve,
        reject,
        rotate: this._onRotatePlacement.bind(this)
      };

      // Activate listeners
      canvas.stage.on("mousemove", this.#events.move);
      canvas.stage.on("mousedown", this.#events.confirm);
      canvas.app.view.oncontextmenu = this.#events.cancel;
      canvas.app.view.onwheel = this.#events.rotate;
    });
  }

  /* -------------------------------------------- */

  /**
   * Shared code for when template placement ends by being confirmed or canceled.
   * @param {Event} event  Triggering event that ended the placement.
   */
  async _finishPlacement(event) {
    this.layer._onDragLeftCancel(event);
    canvas.stage.off("mousemove", this.#events.move);
    canvas.stage.off("mousedown", this.#events.confirm);
    canvas.app.view.oncontextmenu = null;
    canvas.app.view.onwheel = null;
    this.#initialLayer.activate();
  }

  /* -------------------------------------------- */

  /**
   * Move the template preview when the mouse moves.
   * @param {Event} event  Triggering mouse event.
   */
  _onMovePlacement(event) {
    event.stopPropagation();
    if ( this.throttle ) return;
    const adjustment = this.snapAdjustment;
    const point = event.data.getLocalPosition(this.layer);
    const center = canvas.grid.getCenter(point.x - adjustment.x, point.y - adjustment.y);
    this.document.updateSource({ x: center[0] + adjustment.x, y: center[1] + adjustment.y });
    this.placements[0].x = this.document.x - Math.round((this.config.tokens[0].width * canvas.dimensions.size) / 2);
    this.placements[0].y = this.document.y - Math.round((this.config.tokens[0].height * canvas.dimensions.size) / 2);
    this.refresh();
    this.throttle = true;
  }

  /* -------------------------------------------- */

  /**
   * Rotate the template preview by 3˚ increments when the mouse wheel is rotated.
   * @param {Event} event  Triggering mouse event.
   */
  _onRotatePlacement(event) {
    if ( event.ctrlKey ) event.preventDefault(); // Avoid zooming the browser window
    event.stopPropagation();
    const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
    const snap = event.shiftKey ? delta : 5;
    this.placements[0].rotation += snap * Math.sign(event.deltaY);
    this.controlIcon.icon.angle = this.placements[0].rotation;
    this.refresh();
  }

  /* -------------------------------------------- */

  /**
   * Confirm placement when the left mouse button is clicked.
   * @param {Event} event  Triggering mouse event.
   */
  async _onConfirmPlacement(event) {
    await this._finishPlacement(event);
    this.#events.resolve(this.placements);
  }

  /* -------------------------------------------- */

  /**
   * Cancel placement when the right mouse button is clicked.
   * @param {Event} event  Triggering mouse event.
   */
  async _onCancelPlacement(event) {
    await this._finishPlacement(event);
    this.#events.reject();
  }
}

/**
 * A PIXI element for rendering a token preview.
 */
class TokenIcon extends PIXI.Container {
  constructor({texture, width, height, angle, scale}={}, ...args) {
    super(...args);
    const size = Math.min(width, height);
    this.textureSrc = texture;
    this.width = this.height = size;
    this.pivot.set(width * 0.5, height * 0.5);

    this.eventMode = "static";
    this.interactiveChildren = false;

    this.bg = this.addChild(new PIXI.Graphics());
    this.bg.clear().lineStyle(2, 0x000000, 1.0).drawRoundedRect(0, 0, width, height, 5).endFill();

    const halfSize = Math.round(size * 0.5);
    this.icon = this.addChild(new PIXI.Container());
    this.icon.width = size;
    this.icon.height = size;
    this.icon.pivot.set(halfSize, halfSize);
    this.icon.x += halfSize;
    this.icon.y += halfSize;
    if ( width < height ) this.icon.y += Math.round((height - width) / 2);
    else if ( height < width ) this.icon.x += Math.round((width - height) / 2);

    this.iconSprite = this.icon.addChild(new PIXI.Sprite());
    this.iconSprite.width = size * scale.x;
    this.iconSprite.height = size * scale.y;
    this.iconSprite.x -= (scale.x - 1) * halfSize;
    this.iconSprite.y -= (scale.y - 1) * halfSize;

    this.draw();
  }

  /* -------------------------------------------- */

  /**
   * Initial drawing of the TokenIcon.
   * @returns {Promise<TokenIcon>}
   */
  async draw() {
    if ( this.destroyed ) return this;
    this.texture = this.texture ?? await loadTexture(this.textureSrc);
    this.iconSprite.texture = this.texture;
    return this.refresh();
  }

  /* -------------------------------------------- */

  /**
   * Incremental refresh for TokenIcon appearance.
   * @returns {TokenIcon}
   */
  refresh() {
    return this;
  }
}
