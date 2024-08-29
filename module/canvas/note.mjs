/**
 * Add support for drawing custom control icons based on linked journal page type.
 */
export default class Note5e extends Note {
  /** @inheritDoc */
  _drawControlIcon() {
    const tint = Color.from(this.document.texture.tint || null);
    const systemIcon = this.page?.system?.getControlIcon?.({ size: this.size, tint });
    if ( !systemIcon ) return super._drawControlIcon();
    systemIcon.x -= (this.size / 2);
    systemIcon.y -= (this.size / 2);
    return systemIcon;
  }
}
