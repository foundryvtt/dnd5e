/**
 * Extend the base Token class to implement additional system-specific logic.
 */
export default class Token5e extends Token {

  /**
   * Token ring attributes
   * @type {{bkgName: string, ringName: string,
   * ringColorLittleEndian: number, bkgColorLittleEndian: number, effects: number}}
   */
  tokenRing = {
    ringName: undefined,
    bkgName: undefined,
    ringColorLittleEndian: 0xFFFFFF, // Little endian format => BBGGRR
    bkgColorLittleEndian: 0xFFFFFF,  // Little endian format => BBGGRR
    effects: 0
  };

  /* -------------------------------------------- */

  /**
   * Callback invoked when a status effect is applied on a token.
   * @param {Token5e} token         The token whose status effect is applied.
   * @param {string} statusId       The status effect ID being applied, from CONFIG.specialStatusEffects
   * @param {boolean} active        Is the special status effect now active?
   */
  static onApplyTokenStatusEffect(token, statusId, active) {
    if ( (statusId !== CONFIG.specialStatusEffects.INVISIBLE) || !game.dnd5e.tokenRings.enabled ) return;
    const tokenRingFlag = token.document.getFlag("dnd5e", "tokenRing") || {};
    token._configureTokenRingVisuals({...tokenRingFlag});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _draw() {
    // Cache the subject texture if needed
    const subjectName = this.document.getSubjectName();
    const cached = PIXI.Assets.cache.has(subjectName);
    if ( !cached && subjectName ) await TextureLoader.loader.loadTexture(subjectName);
    await super._draw();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _drawBar(number, bar, data) {
    if ( data.attribute === "attributes.hp" ) return this._drawHPBar(number, bar, data);
    return super._drawBar(number, bar, data);
  }

  /* -------------------------------------------- */

  /**
   * Specialized drawing function for HP bars.
   * @param {number} number      The Bar number
   * @param {PIXI.Graphics} bar  The Bar container
   * @param {object} data        Resource data for this bar
   * @private
   */
  _drawHPBar(number, bar, data) {

    // Extract health data
    let {value, max, temp, tempmax} = this.document.actor.system.attributes.hp;
    temp = Number(temp || 0);
    tempmax = Number(tempmax || 0);

    // Differentiate between effective maximum and displayed maximum
    const effectiveMax = Math.max(0, max + tempmax);
    let displayMax = max + (tempmax > 0 ? tempmax : 0);

    // Allocate percentages of the total
    const tempPct = Math.clamped(temp, 0, displayMax) / displayMax;
    const colorPct = Math.clamped(value, 0, effectiveMax) / displayMax;
    const hpColor = dnd5e.documents.Actor5e.getHPColor(value, effectiveMax);

    // Determine colors to use
    const blk = 0x000000;
    const c = CONFIG.DND5E.tokenHPColors;

    // Determine the container size (logic borrowed from core)
    const w = this.w;
    let h = Math.max((canvas.dimensions.size / 12), 8);
    if ( this.document.height >= 2 ) h *= 1.6;
    const bs = Math.clamped(h / 8, 1, 2);
    const bs1 = bs+1;

    // Overall bar container
    bar.clear();
    bar.beginFill(blk, 0.5).lineStyle(bs, blk, 1.0).drawRoundedRect(0, 0, w, h, 3);

    // Temporary maximum HP
    if (tempmax > 0) {
      const pct = max / effectiveMax;
      bar.beginFill(c.tempmax, 1.0).lineStyle(1, blk, 1.0).drawRoundedRect(pct*w, 0, (1-pct)*w, h, 2);
    }

    // Maximum HP penalty
    else if (tempmax < 0) {
      const pct = (max + tempmax) / max;
      bar.beginFill(c.negmax, 1.0).lineStyle(1, blk, 1.0).drawRoundedRect(pct*w, 0, (1-pct)*w, h, 2);
    }

    // Health bar
    bar.beginFill(hpColor, 1.0).lineStyle(bs, blk, 1.0).drawRoundedRect(0, 0, colorPct*w, h, 2);

    // Temporary hit points
    if ( temp > 0 ) {
      bar.beginFill(c.temp, 1.0).lineStyle(0).drawRoundedRect(bs1, bs1, (tempPct*w)-(2*bs1), h-(2*bs1), 1);
    }

    // Set position
    let posY = (number === 0) ? (this.h - h) : 0;
    bar.position.set(0, posY);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    if ( !game.dnd5e.tokenRings.enabled ) return;

    // Update ring names if necessary
    const shapeChange = ("height" in data) || ("width" in data) || ("texture" in data);
    if ( shapeChange ) this._configureRingNames();

    // Do we have some token ring flag changes?
    if ( !foundry.utils.hasProperty(data, "flags.dnd5e.tokenRing") ) return;

    // Do we need to trigger a full redraw? We need to do so if a token ring texture has been updated
    const dataFlag = data.flags.dnd5e.tokenRing;
    const redraw = ("textures" in dataFlag) || ("enabled" in dataFlag);
    if ( redraw ) return this.renderFlags.set({redraw});

    // If we don't need a full redraw, we're just updating the visuals properties
    const tokenRingFlag = this.document.getFlag("dnd5e", "tokenRing") || {};
    this._configureTokenRingVisuals({...tokenRingFlag});
  }

  /* -------------------------------------------- */

  /** @override */
  _refreshShader() {
    if ( game.dnd5e.tokenRings.enabled ) this.mesh?.setShaderClass(game.dnd5e.tokenRings.tokenRingSamplerShader);
    else super._refreshShader();
  }

  /* -------------------------------------------- */

  /**
   * Configure the sprite mesh.
   * @param {PrimarySpriteMesh} [mesh]  The mesh to update.
   */
  configureMesh(mesh) {
    mesh ||= this.mesh;
    const tokenRingFlag = this.document.getFlag("dnd5e", "tokenRing");
    if ( tokenRingFlag?.enabled ) {
      // Configure token ring textures and visuals
      this._configureTokenRingTexture({mesh});
      this._configureTokenRingVisuals({...tokenRingFlag});
    }
    else {
      // Clear everything pertaining to token ring attributes
      this._clearTokenRingState();
    }
  }

  /* -------------------------------------------- */

  /**
   * Configure dynamic token ring subject texture.
   * @param {object} parameters
   * @param {PrimarySpriteMesh|TokenMesh} [parameters.mesh] The mesh.
   * @protected
   */
  _configureTokenRingTexture({mesh}) {
    mesh ||= this.mesh;

    // Should we replace the regular token texture with a custom subject texture?
    const subjectSrc = this.document.getSubjectName();
    if ( PIXI.Assets.cache.has(subjectSrc) ) {
      const subjectTexture = getTexture(subjectSrc);
      if ( subjectTexture?.valid ) mesh.texture = subjectTexture;
    }

    // Assigning the assets' names
    this._configureRingNames();
  }

  /* -------------------------------------------- */

  /**
   * Configure the token ring visuals properties.
   * @param {TokenRingFlagData} parameters
   * @param {object} [parameters.colors]    The colors object.
   * @param {number} [parameters.effects]   The effects value.
   * @protected
   */
  _configureTokenRingVisuals({colors, effects}={}) {
    // Caching the colors into the little endian format
    this.tokenRing.ringColorLittleEndian = Color.from(colors?.ring ?? 0xFFFFFF).littleEndian;
    this.tokenRing.bkgColorLittleEndian = Color.from(colors?.background ?? 0xFFFFFF).littleEndian;

    // Assigning the effects value (bitwise construction)
    const invisible = this.document.hasStatusEffect(CONFIG.specialStatusEffects.INVISIBLE);
    this.tokenRing.effects = ((effects >= game.dnd5e.tokenRings.effects.DISABLED)
      ? effects : game.dnd5e.tokenRings.effects.ENABLED)
      | (invisible ? game.dnd5e.tokenRings.effects.INVISIBILITY : 0x0);
  }

  /* -------------------------------------------- */

  /**
   * Clear all configuration to token rings
   * @protected
   */
  _clearTokenRingState() {
    const invisible = this.document.hasStatusEffect(CONFIG.specialStatusEffects.INVISIBLE);
    this.tokenRing = {
      ringName: undefined,
      bkgName: undefined,
      ringColorLittleEndian: 0xFFFFFF, // Little endian format => BBGGRR
      bkgColorLittleEndian: 0xFFFFFF,  // Little endian format => BBGGRR
      effects: (invisible ? game.dnd5e.tokenRings.effects.INVISIBILITY : game.dnd5e.tokenRings.effects.DISABLED)
    };
  }

  /* -------------------------------------------- */

  /**
   * Configure token ring names according to size.
   * @protected
   */
  _configureRingNames() {
    const size = Math.max(this.w * this.document.texture.scaleX ?? 1, this.h * this.document.texture.scaleY);
    Object.assign(this.tokenRing, game.dnd5e.tokenRings.getRingDataBySize(size));
  }
}
