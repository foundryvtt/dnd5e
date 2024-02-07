import {TOKEN_RING_FRAG_HEADER, TOKEN_RING_FRAG_MAIN} from "./parts/token-ring-shader-core.mjs";

/**
 * Unused in v11, this line prevents errors when importing the class conditionally.
 */
if ( typeof PrimaryBaseSamplerShader === "undefined" ) window.PrimaryBaseSamplerShader = class {};

/**
 * The V12+ token ring shader class.
 */
export default class TokenRingSamplerShader extends PrimaryBaseSamplerShader {

  /** @override */
  static classPluginName = "batchTokenRing";

  /* -------------------------------------------- */

  /** @override */
  static pausable = false;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static batchGeometry = [
    ...super.batchGeometry,
    {id: "aRingTextureCoord", size: 2, normalized: false, type: PIXI.TYPES.FLOAT},
    {id: "aBackgroundTextureCoord", size: 2, normalized: false, type: PIXI.TYPES.FLOAT},
    {id: "aRingColor", size: 4, normalized: true, type: PIXI.TYPES.UNSIGNED_BYTE},
    {id: "aBackgroundColor", size: 4, normalized: true, type: PIXI.TYPES.UNSIGNED_BYTE},
    {id: "aStates", size: 1, normalized: false, type: PIXI.TYPES.FLOAT},
    {id: "aScaleCorrection", size: 1, normalized: false, type: PIXI.TYPES.FLOAT}
  ];

  /* -------------------------------------------- */

  /** @inheritdoc */
  static batchVertexSize = super.batchVertexSize + 8;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static reservedTextureUnits = super.reservedTextureUnits + 1;

  /* -------------------------------------------- */

  /**
   * A null UVs array used for nulled texture position.
   * @type {Float32Array}
   */
  static nullUvs = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]);

  /* -------------------------------------------- */

  /** @inheritdoc */
  static batchDefaultUniforms(maxTex) {
    return {
      ...super.batchDefaultUniforms(maxTex),
      tokenRingTexture: maxTex + super.reservedTextureUnits,
      time: 0
    };
  }

  /* -------------------------------------------- */

  /** @override */
  static _preRenderBatch(batchRenderer) {
    super._preRenderBatch(batchRenderer);
    batchRenderer.renderer.texture.bind(CONFIG.Token.ringClass.baseTexture, batchRenderer.uniforms.tokenRingTexture);
    batchRenderer.uniforms.time = canvas.app.ticker.lastTime / 1000;
  }

  /* ---------------------------------------- */

  /** @inheritdoc */
  static _packInterleavedGeometry(element, attributeBuffer, indexBuffer, aIndex, iIndex) {
    super._packInterleavedGeometry(element, attributeBuffer, indexBuffer, aIndex, iIndex);
    const {float32View, uint32View} = attributeBuffer;

    // Prepare token ring attributes
    const vertexData = element.vertexData;
    const trConfig = CONFIG.Token.ringClass;
    const object = element.object.object || {};
    const ringColor = PIXI.Color.shared.setValue(object.ring?.ringColorLittleEndian ?? 0xFFFFFF).toNumber();
    const bkgColor = PIXI.Color.shared.setValue(object.ring?.bkgColorLittleEndian ?? 0xFFFFFF).toNumber();
    const ringUvsFloat = object.ring?.ringUVs ?? trConfig.tokenRingSamplerShader.nullUvs;
    const bkgUvsFloat = object.ring?.bkgUVs ?? trConfig.tokenRingSamplerShader.nullUvs;
    const states = (object.ring?.effects ?? 0) + 0.5;
    const scaleCorrection = object.ring?.scaleCorrection ?? 1;

    // Write attributes into buffer
    const vertexSize = this.vertexSize;
    const attributeOffset = PrimaryBaseSamplerShader.batchVertexSize;
    for ( let i = 0, j = attributeOffset; i < vertexData.length; i += 2, j += vertexSize ) {
      let k = aIndex + j;
      float32View[k++] = ringUvsFloat[i];
      float32View[k++] = ringUvsFloat[i + 1];
      float32View[k++] = bkgUvsFloat[i];
      float32View[k++] = bkgUvsFloat[i + 1];
      uint32View[k++] = ringColor;
      uint32View[k++] = bkgColor;
      float32View[k++] = states;
      float32View[k++] = scaleCorrection;
    }
  }

  /* ---------------------------------------- */

  /** @override */
  static _batchVertexShader = `
      in vec2 aRingTextureCoord;
      in vec2 aBackgroundTextureCoord;
      in vec4 aRingColor;
      in vec4 aBackgroundColor;
      in float aStates;
      in float aScaleCorrection;

      out vec2 vRingTextureCoord;
      out vec2 vBackgroundTextureCoord;
      flat out vec3 vRingColor;
      flat out vec3 vBackgroundColor;
      flat out uint vStates;
      flat out float vScaleCorrection;

      void _main(out vec2 vertexPosition, out vec2 textureCoord, out vec4 color) {
        vRingTextureCoord = aRingTextureCoord;
        vBackgroundTextureCoord = aBackgroundTextureCoord;
        vRingColor = aRingColor.rgb;
        vBackgroundColor = aBackgroundColor.rgb;
        vStates = uint(aStates);
        vScaleCorrection = aScaleCorrection;
        vertexPosition = (translationMatrix * vec3(aVertexPosition, 1.0)).xy;
        textureCoord = aTextureCoord;
        color = aColor * tint;
      }
    `;

  /* -------------------------------------------- */

  /** @override */
  static _batchFragmentShader = `
      in vec2 vRingTextureCoord;
      in vec2 vBackgroundTextureCoord;
      flat in vec3 vRingColor;
      flat in vec3 vBackgroundColor;
      flat in uint vStates;
      flat in float vScaleCorrection;

      uniform sampler2D tokenRingTexture;
      uniform float time;

      ${this.CONSTANTS}
      ${this.PERCEIVED_BRIGHTNESS}
      ${TOKEN_RING_FRAG_HEADER}

      vec4 _main() {
        ${TOKEN_RING_FRAG_MAIN}
        return result;
      }
    `;
}
