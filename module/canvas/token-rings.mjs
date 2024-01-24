/**
 * Manages and configures dnd5e token rings framework.
 */
export default class TokenRings5e {
  constructor() {
    this.#initialize();
  }

  /**
   * The effects which could be applied to a token ring (using bitwise operations.)
   * @enum {number}
   * @readonly
   */
  static tokenRingEffects = Object.freeze({
    DISABLED: 0x00,
    ENABLED: 0x01,
    RING_PULSE: 0x02,
    RING_GRADIENT: 0x04,
    BKG_WAVE: 0x08,
    INVISIBILITY: 0x10
  });

  /**
   * Token Rings sprite sheet base texture.
   * @type {PIXI.BaseTexture}
   */
  baseTexture;

  /**
   * Rings and background textures UVs and center offset.
   * @type {Record<string, {UVs: Float32Array, center: {x: number, y: number}}>}
   */
  texturesData;

  /**
   * The token ring shader class definition.
   * @type {typeof TokenRingSamplerShaderV11|typeof TokenRingSamplerShader}
   */
  tokenRingSamplerShader;

  /**
   * Ring data with their ring name, background name and size.
   * @type {{ringName: string, bkgName: string, size: number}[]}
   */
  #ringData;

  /* -------------------------------------------- */

  /**
   * Get the enum object containing the applicable token ring effects.
   * @type {object}
   */
  get effects() {
    return this.constructor.tokenRingEffects;
  }

  /* -------------------------------------------- */

  /**
   * Is the token rings framework enabled?
   * @type {boolean}
   * @readonly
   */
  get enabled() {
    return this.#enabled;
  }

  #enabled;

  /* -------------------------------------------- */

  /**
   * Initialize the Token Rings behaviors
   * - Register the batch plugin
   * - Patch PrimaryCanvasGroup#addToken
   */
  #initialize() {
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
  pushToLoad(additionalSources) {
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
  createAssetsUvs() {
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
  getTextureUVs(name, scaleCorrection=1) {
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
  getRingDataBySize(size) {
    if ( !Number.isFinite(size) || !this.#ringData.length ) return {ringName: undefined, bkgName: undefined};
    const adjustedSize = size * 1.4;

    // Search in the sorted rings data
    for ( const ring of this.#ringData ) {
      if ( adjustedSize <= ring.size ) return {ringName: ring.ringName, bkgName: ring.bkgName};
    }

    // No match? we are returning the biggest
    const lastRing = this.#ringData.at(-1);
    return {ringName: lastRing.ringName, bkgName: lastRing.bkgName};
  }
}
