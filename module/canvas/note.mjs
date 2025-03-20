/**
 * Add support for drawing custom control icons based on linked journal page type.
 */
export default class Note5e extends foundry.canvas.placeables.Note {
  /** @inheritDoc */
  _drawControlIcon() {
    const tint = Color.from(this.document.texture.tint || null);
    const systemIcon = this.page?.system?.getControlIcon?.({ size: this.document.iconSize, tint });
    if ( !systemIcon ) return super._drawControlIcon();
    systemIcon.x -= (this.document.iconSize / 2);
    systemIcon.y -= (this.document.iconSize / 2);
    return systemIcon;
  }
}
