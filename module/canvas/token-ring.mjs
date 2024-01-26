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
    Object.assign(this, this.constructor.getRingDataBySize(size));

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
    this.ringUVs = this.constructor.getTextureUVs(this.ringName, scaleCorrection);
    this.bkgUVs = this.constructor.getTextureUVs(this.bkgName, scaleCorrection);
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
    this.effects = ((effects >= this.constructor.effects.DISABLED)
      ? effects : this.constructor.effects.ENABLED)
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
      ? this.constructor.effects.INVISIBILITY : this.constructor.effects.DISABLED;
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
      easing: this.constructor.createSpikeEasing(.15),
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

  /* -------------------------------------------- */
  /*  Rings System                                */
  /* -------------------------------------------- */

  /**
   * The effects which could be applied to a token ring (using bitwise operations.)
   * @enum {number}
   * @readonly
   */
  static effects = Object.freeze({
    DISABLED: 0x00,
    ENABLED: 0x01,
    RING_PULSE: 0x02,
    RING_GRADIENT: 0x04,
    BKG_WAVE: 0x08,
    INVISIBILITY: 0x10
  });

  /* -------------------------------------------- */

  /**
   * Is the token rings framework enabled? Will be `null` if the system hasn't initialized yet.
   * @type {boolean|null}
   * @readonly
   */
  static get enabled() {
    return this.#enabled;
  }

  static #enabled = null;

  /* -------------------------------------------- */

  /**
   * Token Rings sprite sheet base texture.
   * @type {PIXI.BaseTexture}
   */
  static baseTexture;

  /**
   * Rings and background textures UVs and center offset.
   * @type {Record<string, {UVs: Float32Array, center: {x: number, y: number}}>}
   */
  static texturesData;

  /**
   * The token ring shader class definition.
   * @type {typeof TokenRingSamplerShaderV11|typeof TokenRingSamplerShader}
   */
  static tokenRingSamplerShader;

  /**
   * Ring data with their ring name, background name and size.
   * @type {{ringName: string, bkgName: string, size: number}[]}
   */
  static #ringData;

  /* -------------------------------------------- */

  /**
   * Initialize the Token Rings system, registering the batch plugin and patching PrimaryCanvasGroup#addToken.
   */
  static initialize() {
    if ( this.enabled !== null ) throw new Error("TokenRings system already initialized.");

    // Check client setting
    this.#enabled = !(game.settings.get("dnd5e", "disableTokenRings") ?? false);
    if ( !this.enabled ) return;

    this.tokenRingSamplerShader = CONFIG.DND5E.tokenRings.shaderClass;
    if ( game.release.generation >= 12 ) {
      PrimaryBaseSamplerShader.classPluginName = this.tokenRingSamplerShader.classPluginName;
    }
    this.tokenRingSamplerShader.registerPlugin();
    const addToken = PrimaryCanvasGroup.prototype.addToken;

    /**
     * Monkey patch addToken to include custom mesh configuration.
     * @param {Token5e} token
     * @returns {TokenMesh|PrimarySpriteMesh}
     */
    PrimaryCanvasGroup.prototype.addToken = token => {
      const mesh = addToken.call(canvas.primary, token);
      token.ring?.configureMesh(mesh);
      return mesh;
    };
  }

  /* -------------------------------------------- */

  /**
   * Push all assets necessary to cache for the Token Rings framework.
   * @param {string[]} additionalSources
   */
  static pushToLoad(additionalSources) {
    additionalSources.push(CONFIG.DND5E.tokenRings.spriteSheet);
    for ( const tokenDocument of canvas.scene.tokens ) {
      const subjectSrc = tokenDocument.subjectPath;
      if ( tokenDocument.hasDynamicRing && subjectSrc ) additionalSources.push(subjectSrc);
    }
  }

  /* -------------------------------------------- */

  /**
   * Create texture UVs for each asset into the token rings sprite sheet.
   */
  static createAssetsUVs() {
    if ( !this.enabled ) return;

    const spritesheet = TextureLoader.loader.getCache(CONFIG.DND5E.tokenRings.spriteSheet);
    this.baseTexture = spritesheet.baseTexture;
    this.texturesData = {};
    this.#ringData = [];

    const frames = Object.keys(spritesheet.data.frames || {});
    for ( const asset of frames ) {
      const assetTexture = PIXI.Assets.cache.get(asset);
      if ( !assetTexture ) continue;

      // Extracting texture UVs
      const frame = assetTexture.frame;
      const textureUvs = new PIXI.TextureUvs();
      textureUvs.set(frame, assetTexture.baseTexture, assetTexture.rotate);
      this.texturesData[asset] = {
        UVs: textureUvs.uvsFloat32,
        center: {
          x: frame.center.x / assetTexture.baseTexture.width,
          y: frame.center.y / assetTexture.baseTexture.height
        }
      };

      // Extracting dimensions
      if ( asset.includes("-bkg") ) continue;
      const size = Math.max(assetTexture.height, assetTexture.width);
      this.#ringData.push({
        ringName: asset,
        bkgName: `${asset}-bkg`,
        size
      });
    }

    // Sorting the rings data array
    this.#ringData.sort((a, b) => a.size - b.size);
  }

  /* -------------------------------------------- */

  /**
   * Get the UVs array for a given texture name and scale correction.
   * @param {string} name                  Name of the texture we want to get UVs.
   * @param {number} [scaleCorrection=1]   The scale correction applied to UVs.
   * @returns {Float32Array}
   */
  static getTextureUVs(name, scaleCorrection=1) {
    if ( scaleCorrection === 1 ) return this.texturesData[name].UVs;
    const tUVs = this.texturesData[name].UVs;
    const c = this.texturesData[name].center;
    const UVs = new Float32Array(8);
    for ( let i=0; i<8; i+=2 ) {
      UVs[i] = ((tUVs[i] - c.x) * scaleCorrection) + c.x;
      UVs[i+1] = ((tUVs[i+1] - c.y) * scaleCorrection) + c.y;
    }
    return UVs;
  }

  /* -------------------------------------------- */

  /**
   * Get ring and background names for a given size.
   * @param {number} size   The size to match
   * @returns {{bkgName: string, ringName: string}}
   */
  static getRingDataBySize(size) {
    if ( !Number.isFinite(size) || !this.#ringData.length ) return { ringName: undefined, bkgName: undefined };
    const adjustedSize = size * 1.4;

    // Search in the sorted rings data
    for ( const ring of this.#ringData ) {
      if ( adjustedSize <= ring.size ) return { ringName: ring.ringName, bkgName: ring.bkgName };
    }

    // No match? we are returning the biggest
    const lastRing = this.#ringData.at(-1);
    return { ringName: lastRing.ringName, bkgName: lastRing.bkgName };
  }
}
