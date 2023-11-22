export default class MapLocationControlIcon extends PIXI.Container {
  constructor({code, size=40, ...style}={}, ...args) {
    super(...args);

    this.code = code;
    this.size = size;
    this.style = style;

    this.radius = size / 2;
    this.circle = [this.radius, this.radius, this.radius + 8];
    this.backgroundColor = this.style.backgroundColor;
    this.borderColor = this.style.borderHoverColor;

    // Define hit area
    this.eventMode = "static";
    this.interactiveChildren = false;
    this.hitArea = new PIXI.Circle(...this.circle);
    this.cursor = "pointer";

    // Drop Shadow
    this.shadow = this.addChild(new PIXI.Graphics());
    this.shadow.clear()
      .beginFill(this.style.borderColor, 0.65)
      .drawCircle(this.radius + 8, this.radius + 8, this.radius + 10)
      .endFill();
    this.shadow.filters = [new PIXI.filters.BlurFilter(16)];

    // 3D Effect
    this.extrude = this.addChild(new PIXI.Graphics());
    this.extrude.clear()
      .beginFill(this.style.borderColor, 1.0)
      .drawCircle(this.radius + 2, this.radius + 2, this.radius + 9)
      .endFill();

    // Background
    this.bg = this.addChild(new PIXI.Graphics());
    this.bg.clear()
      .beginFill(this.backgroundColor, 1.0)
      .lineStyle(2, this.style.borderColor, 1.0)
      .drawCircle(...this.circle)
      .endFill();

    // Text
    this.text = new PreciseText(this.code, this._getTextStyle());
    this.text.anchor.set(0.5, 0.5);
    this.text.position.set(this.radius, this.radius);
    this.addChild(this.text);

    // Border
    this.border = this.addChild(new PIXI.Graphics());
    this.border.visible = false;

    this.refresh();
  }

  /* -------------------------------------------- */

  /**
   * Code text to be rendered.
   * @type {string}
   */
  code;

  /* -------------------------------------------- */

  /** @inheritdoc */
  refresh({ visible, iconColor, borderColor, borderVisible }={}) {
    if ( borderColor ) this.borderColor = borderColor;
    this.border.clear().lineStyle(2, this.borderColor, 1.0).drawCircle(...this.circle).endFill();
    if ( borderVisible !== undefined ) this.border.visible = borderVisible;
    if ( visible !== undefined ) this.visible = visible;
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Define PIXI TestStyle object for rendering the map location code.
   * @returns {PIXI.TextStyle}
   */
  _getTextStyle() {
    const style = CONFIG.canvasTextStyle.clone();
    style.dropShadow = false;
    style.fill = Color.from(this.style.textColor);
    style.strokeThickness = 0;
    if ( this.style.fontFamily ) {
      style.fontFamily = this.style.fontFamily;
    }
    return style;
  }
}
