/**
 * Class for handling the dynamic token rings.
 * @param {Token5e} token  Reference to the token containing this ring.
 */
export default class TokenRing {
  constructor(token) {
    this.#token = new WeakRef(token);
  }

  /* -------------------------------------------- */
  /*  Attributes                                  */
  /*                                              */
  /*  Note: Changes to any of these attributes    */
  /*  will be directly reflected in the ring.     */
  /* -------------------------------------------- */

  /** @type {string} */
  ringName;

  /** @type {string} */
  bkgName;

  /** @type {Float32Array} */
  ringUVs;

  /** @type {Float32Array} */
  bkgUVs;

  /** @type {number} */
  ringColorLittleEndian = 0xFFFFFF; // Little endian format => BBGGRR

  /** @type {number} */
  bkgColorLittleEndian = 0xFFFFFF; // Little endian format => BBGGRR

  /** @type {number} */
  effects = 0;

  /** @type {number} */
  scaleCorrection = 1;

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Is the dynamic ring currently enabled?
   * @type {boolean}
   */
  get enabled() {
    return this.token?.document.hasDynamicRing;
  }

  /* -------------------------------------------- */

  /**
   * Weak reference to the token being animated.
   * @type {WeakRef<Token5e>}
   */
  #token;

  /**
   * Reference to the token that should be animated.
   * @type {Token5e|void}
   */
  get token() {
    return this.#token.deref();
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Configure the sprite mesh.
   * @param {PrimarySpriteMesh} [mesh]  The mesh to update.
   */
  configureMesh(mesh) {
    mesh ||= this.token.mesh;

    // Configure token ring textures and visuals
    if ( this.enabled ) {
      const tokenRingFlag = this.token.document.getFlag("dnd5e", "tokenRing");
      this._configureTexture({mesh, ...tokenRingFlag});
      this.configureVisuals({...tokenRingFlag});
    }

    // Clear everything pertaining to token ring attributes
    else {
      this._clearState();
    }
  }

  /* -------------------------------------------- */

  /**
   * Configure token ring names according to size.
   * @param {TokenRingFlagData} parameters
   * @param {number} [parameters.scaleCorrection]   The scale correction value.
   */
  configureNames({scaleCorrection}={}) {
    const size = Math.max(
      this.token.w * this.token.document.texture.scaleX ?? 1,
      this.token.h * this.token.document.texture.scaleY);
    Object.assign(this, game.dnd5e.tokenRings.getRingDataBySize(size));

    // Configure assets' UVs
    this.configureUVs(scaleCorrection ?? this.scaleCorrection);
  }

  /* -------------------------------------------- */

  /**
   * Configure token ring UVs according to scale correction.
   * @param {number} scaleCorrection        The scale correction value.
   */
  configureUVs(scaleCorrection) {
    this.scaleCorrection = scaleCorrection ?? 1;
    this.ringUVs = game.dnd5e.tokenRings.getTextureUVs(this.ringName, scaleCorrection);
    this.bkgUVs = game.dnd5e.tokenRings.getTextureUVs(this.bkgName, scaleCorrection);
  }

  /* -------------------------------------------- */

  /**
   * Configure the token ring visuals properties.
   * @param {TokenRingFlagData} parameters
   * @param {object} [parameters.colors]    The colors object.
   * @param {number} [parameters.effects]   The effects value.
   */
  configureVisuals({colors, effects}={}) {
    // Caching the colors into the little endian format
    foundry.utils.mergeObject(colors, this.token.document.getRingColors());
    this.ringColorLittleEndian = Color.from(colors?.ring ?? 0xFFFFFF).littleEndian;
    this.bkgColorLittleEndian = Color.from(colors?.background ?? 0xFFFFFF).littleEndian;

    // Assigning the effects value (bitwise construction)
    const effectsToApply = this.token.document.getRingEffects();
    this.effects = ((effects >= game.dnd5e.tokenRings.effects.DISABLED)
      ? effects : game.dnd5e.tokenRings.effects.ENABLED)
      | effectsToApply.reduce((acc, e) => acc |= e, 0x0);
  }

  /* -------------------------------------------- */

  /**
   * Configure dynamic token ring subject texture.
   * @param {object} parameters
   * @param {PrimarySpriteMesh|TokenMesh} [parameters.mesh] The mesh.
   * @param {number} [parameters.scaleCorrection]           The scale correction value.
   * @protected
   */
  _configureTexture({mesh, scaleCorrection}) {
    mesh ||= this.token.mesh;

    // Should we replace the regular token texture with a custom subject texture?
    const subjectSrc = this.token.document.subjectPath;
    if ( PIXI.Assets.cache.has(subjectSrc) ) {
      const subjectTexture = getTexture(subjectSrc);
      if ( subjectTexture?.valid ) mesh.texture = subjectTexture;
    }

    // Assigning the assets' names
    this.configureNames({scaleCorrection});
  }

  /* -------------------------------------------- */

  /**
   * Clear all configuration to token rings
   * @protected
   */
  _clearState() {
    this.ringName = undefined;
    this.bkgName = undefined;
    this.ringUVs = undefined;
    this.bkgUVs = undefined;
    this.ringColorLittleEndian = 0xFFFFFF;
    this.bkgColorLittleEndian = 0xFFFFFF;
    this.effects = this.token.document.hasStatusEffect(CONFIG.specialStatusEffects.INVISIBLE)
      ? game.dnd5e.tokenRings.effects.INVISIBILITY : game.dnd5e.tokenRings.effects.DISABLED;
    this.scaleCorrection = 1;
  }

  /* -------------------------------------------- */
  /*  Animations                                  */
  /* -------------------------------------------- */

  /**
   * Flash the ring briefly with a certain color.
   * @param {Color} color                              Color to flash.
   * @param {CanvasAnimationOptions} animationOptions  Options to customize the animation.
   * @returns {Promise<boolean|void>}
   */
  async flashColor(color, animationOptions={}) {
    if ( !this.enabled || Number.isNaN(color) ) return;

    const originalColor = new Color(this.ringColorLittleEndian);

    return await CanvasAnimation.animate([{
      attribute: "ringColorLittleEndian",
      parent: this,
      from: originalColor,
      to: new Color(color.littleEndian),
      color: true
    }], foundry.utils.mergeObject({
      duration: 1600,
      priority: PIXI.UPDATE_PRIORITY.HIGH,
      easing: TokenRing.createSpikeEasing(.15),
      ontick: (d, data) => {
        // Manually set the final value to the origin due to issue with the CanvasAnimation
        // See: https://github.com/foundryvtt/foundryvtt/issues/10364
        if ( data.time >= data.duration ) this.ringColorLittleEndian = originalColor;
      }
    }, animationOptions));
  }

  /* -------------------------------------------- */

  /**
   * Create an easing function that spikes in the center. Ideal duration is around 1600ms.
   * @param {number} [spikePct=0.5]  Position on [0,1] where the spike occurs.
   * @returns {Function(number): number}
   */
  static createSpikeEasing(spikePct=0.5) {
    const scaleStart = 1 / spikePct;
    const scaleEnd = 1 / (1 - spikePct);
    return pt => {
      if ( pt < spikePct ) return CanvasAnimation.easeInCircle(pt * scaleStart);
      else return 1 - CanvasAnimation.easeOutCircle(((pt - spikePct) * scaleEnd));
    };
  }

  /* -------------------------------------------- */

  /**
   * Easing function that produces two peaks before returning to the original value. Ideal duration is around 500ms.
   * @param {number} pt     The proportional animation timing on [0,1].
   * @returns {number}      The eased animation progress on [0,1].
   */
  static easeTwoPeaks(pt) {
    return (Math.sin((4 * Math.PI * pt) - (Math.PI / 2)) + 1) / 2;
  }
}
