/**
 * Extend the base Token class to implement additional system-specific logic.
 *
 * @extends {Token}
 */
export default class Token5e extends Token {

  /** @override */
  _drawBar(number, bar, data) {
    if ( data.attribute === "attributes.hp" ) return this._drawHPBar(number, bar, data);
    return super._drawBar(number, bar, data);
  }

  /* -------------------------------------------- */

  /**
   * Specialized drawing function for HP bars.
   *
   * @param {number} number      The Bar number
   * @param {PIXI.Graphics} bar  The Bar container
   * @param {object} data        Resource data for this bar
   * @private
   */
  _drawHPBar(number, bar, data) {
    const _hp = duplicate(this.document.actor.data.data.attributes.hp);
    const hp = {
      max: Number(_hp.max),
      temp: Number(_hp.temp),
      tempmax: Number(_hp.tempmax),
      value: Number(_hp.value),
    }

    let size = hp.max;
    const currentMax = Math.max(0, Number(_hp.max) + Number(_hp.tempmax));

    // Size of bar is max + temp max if temp max is positive
    if (hp.tempmax > 0) size += hp.tempmax;
    const positiveMax = size;

    // If temp exceeds max, bar is scaled to show total temp
    if (hp.temp > size) size = hp.temp;

    const tempPct = Math.clamped(hp.temp, 0, size) / size;
    const valuePct = Math.clamped(hp.value, 0, currentMax) / size;
    const maxPct = Math.clamped(positiveMax - Math.abs(hp.tempmax), 0, positiveMax) / size;
    const valueColorPct = Math.clamped(hp.value, 0, currentMax) / currentMax;

    const maxBackgroundColor = (hp.tempmax > 0) ? 0xf4f4f4 : 0x999999;

    const w = this.w;
    let h = Math.max((canvas.dimensions.size / 12), 8);
    if ( this.data.height >= 2 ) h *= 1.6;

    bar.clear()
       .beginFill(0x000000, 0.5)
       .lineStyle(2, 0x000000, 0.9)
       .drawRoundedRect(0, 0, w, h, 3);

    // Temp Max Background
    if (hp.tempmax != 0) {
      bar.beginFill(maxBackgroundColor, 0.8)
         .lineStyle(1, 0x000000, 0.0)
         .drawRoundedRect((maxPct*w-2), 1, (1-maxPct)*w, h-2, 2);
    }

    bar.beginFill(PIXI.utils.rgb2hex([(1-(valueColorPct/2)), valueColorPct, 0]))
       .lineStyle(1, 0x000000, 0.8)
       .drawRoundedRect(1, 1, valuePct*(w-2), h-2, 2)
       .beginFill(0x559cc6, 0.5)
       .lineStyle(0, 0x000000, 0.0)
       .drawRoundedRect(1, 1, tempPct*(w-2), h-2, 2);

    // Negative temp max line
    if (hp.tempmax < 0) {
      bar.lineStyle(2, 0xf4f4f4)
         .moveTo(maxPct*(w-2), -1)
         .lineTo(maxPct*(w-2), h+1);
    }

    // Set position
    let posY = number === 0 ? this.h - h : 0;
    bar.position.set(0, posY);
  }

}
