const { ControlIcon, PreciseText } = foundry.canvas.containers;

/**
 * @import { MapLocationMarkerStyle } from "../_types.mjs";
 */

/**
 * Custom control icon used to display Map Location journal pages when pinned to the map.
 */
export default class MapLocationControlIcon extends ControlIcon {
  constructor({ code, ...options }={}) {
    super(options);

    this.code = code;
    this.style = options;

    this.bg.alpha = 1;
    this.bg.tint = 0xFFFFFF;

    this.extrude = this.addChildAt(new PIXI.Graphics(), 0);

    this.shadow = this.addChildAt(new PIXI.Graphics(), 0);
    this.shadow.filters = [new PIXI.filters.BlurFilter(16)];

    this.text = this.addChild(new PreciseText(this.code, this._getTextStyle(this.code.length, this.size)));
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Code text to be rendered.
   * @type {string}
   */
  code;

  /* -------------------------------------------- */

  /**
   * Styling options for the marker.
   * @type {Omit<MapLocationMarkerStyle, "icon">}
   */
  style;

  /* -------------------------------------------- */
  /*  Drawing                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _clear() {
    super._clear();
    this.extrude.clear();
    this.shadow.clear();
    this.text.text = "";
  }

  /* -------------------------------------------- */

  /** @override */
  _refresh() {
    this.radius = this.size / 2;
    this.circle = [this.radius, this.radius, this.radius + 8];

    // Define hit area
    this.hitArea = new PIXI.Circle(...this.circle);
    this.cursor = "pointer";

    // Drop Shadow
    this.shadow.clear()
      .beginFill(this.style.shadowColor, 0.65)
      .drawCircle(this.radius + 8, this.radius + 8, this.radius + 10)
      .endFill();

    // 3D Effect
    this.extrude.clear()
      .beginFill(this.style.borderColor, 1.0)
      .drawCircle(this.radius + 2, this.radius + 2, this.radius + 9)
      .endFill();

    // Background
    this.bg.clear()
      .beginFill(this.style.backgroundColor, 1.0)
      .lineStyle(2, this.style.borderColor, 1.0)
      .drawCircle(...this.circle)
      .endFill();

    // Text
    this.text.text = this.code;
    this.text.style = this._getTextStyle(this.code.length, this.size);
    this.text.anchor.set(0.5, 0.5);
    this.text.position.set(this.radius, this.radius);

    // Border
    this.border.visible = false;

    foundry.canvas.interaction.MouseInteractionManager.emulateMoveEvent();
  }

  /* -------------------------------------------- */

  /**
   * Determine the proper text size based on the character count and the size of the icon.
   * @param {number} characterCount  Number of characters in the code.
   * @param {number} size            Size of the icon in the Scene.
   * @returns {number}
   * @protected
   */
  _getTextSize(characterCount, size) {
    return characterCount > 2 ? size * .5 : size * .6;
  }

  /* -------------------------------------------- */

  /**
   * Define PIXI TestStyle object for rendering the map location code.
   * @param {number} characterCount  Number of characters in the code.
   * @param {number} size            Size of the icon in the Scene.
   * @returns {PIXI.TextStyle}
   * @protected
   */
  _getTextStyle(characterCount, size) {
    const style = CONFIG.canvasTextStyle.clone();
    style.dropShadow = false;
    style.fill = Color.from(this.style.textColor);
    style.strokeThickness = 0;
    style.fontFamily = ["Signika"];
    if ( this.style.fontFamily ) style.fontFamily.unshift(this.style.fontFamily);
    style.fontSize = this._getTextSize(characterCount, size);
    return style;
  }
}
