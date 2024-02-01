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

  /** @override */
  static batchVertexSize = 15;

  /* -------------------------------------------- */

  /** @override */
  static reservedTextureUnits = 2;

  /* -------------------------------------------- */

  /**
   * A null UVs array used for nulled texture position.
   * @type {Float32Array}
   */
  static nullUvs = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]);

  /* -------------------------------------------- */

  /** @override */
  static batchDefaultUniforms(maxTex) {
    return {
      screenDimensions: [1, 1],
      occlusionTexture: maxTex,
      tokenRingTexture: maxTex + 1,
      occlusionBlurStrength: 0,
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

  /** @override */
  static initializeBatchGeometry() {
    this.batchGeometry =
      class BatchGeometry extends PIXI.Geometry {
        /** @override */
        constructor(_static = false) {
          super();
          this._buffer = new PIXI.Buffer(null, _static, false);
          this._indexBuffer = new PIXI.Buffer(null, _static, true);
          this.addAttribute("aVertexPosition", this._buffer, 2, false, PIXI.TYPES.FLOAT)
            .addAttribute("aTextureCoord", this._buffer, 2, false, PIXI.TYPES.FLOAT)
            .addAttribute("aRingTextureCoord", this._buffer, 2, false, PIXI.TYPES.FLOAT)
            .addAttribute("aBackgroundTextureCoord", this._buffer, 2, false, PIXI.TYPES.FLOAT)
            .addAttribute("aColor", this._buffer, 4, true, PIXI.TYPES.UNSIGNED_BYTE)
            .addAttribute("aRingColor", this._buffer, 4, true, PIXI.TYPES.UNSIGNED_BYTE)
            .addAttribute("aBackgroundColor", this._buffer, 4, true, PIXI.TYPES.UNSIGNED_BYTE)
            .addAttribute("aTextureId", this._buffer, 1, false, PIXI.TYPES.UNSIGNED_SHORT)
            .addAttribute("aUnoccludedAlpha", this._buffer, 1, true, PIXI.TYPES.UNSIGNED_BYTE)
            .addAttribute("aOccludedAlpha", this._buffer, 1, true, PIXI.TYPES.UNSIGNED_BYTE)
            .addAttribute("aOcclusionElevation", this._buffer, 1, true, PIXI.TYPES.UNSIGNED_BYTE)
            .addAttribute("aFadeOcclusion", this._buffer, 1, true, PIXI.TYPES.UNSIGNED_BYTE)
            .addAttribute("aRadialOcclusion", this._buffer, 1, true, PIXI.TYPES.UNSIGNED_BYTE)
            .addAttribute("aVisionOcclusion", this._buffer, 1, true, PIXI.TYPES.UNSIGNED_BYTE)
            .addAttribute("aStates", this._buffer, 1, false, PIXI.TYPES.FLOAT)
            .addAttribute("aScaleCorrection", this._buffer, 1, false, PIXI.TYPES.FLOAT)
            .addIndex(this._indexBuffer);
        }
      };
  }

  /* ---------------------------------------- */

  /** @override */
  static _packInterleavedGeometry(element, attributeBuffer, indexBuffer, aIndex, iIndex) {
    const {float32View, uint8View, uint16View, uint32View} = attributeBuffer;

    // Write indices into buffer
    const packedVertices = aIndex / this.vertexSize;
    const indices = element.indices;
    for ( let i = 0; i < indices.length; i++ ) {
      indexBuffer[iIndex++] = packedVertices + indices[i];
    }

    // Prepare attributes
    const vertexData = element.vertexData;
    const uvs = element.uvs;
    const baseTexture = element._texture.baseTexture;
    const alpha = Math.min(element.worldAlpha, 1.0);
    const argb = PIXI.Color.shared.setValue(element._tintRGB).toPremultiplied(alpha, baseTexture.alphaMode > 0);
    const textureId = baseTexture._batchLocation;
    const unoccludedAlpha = (element.unoccludedAlpha * 255) | 0;
    const occludedAlpha = (element.occludedAlpha * 255) | 0;
    const occlusionElevation = (canvas.masks.occlusion.mapElevation(element.elevation) * 255) | 0;
    const fadeOcclusion = (element.fadeOcclusion * 255) | 0;
    const radialOcclusion = (element.radialOcclusion * 255) | 0;
    const visionOcclusion = (element.visionOcclusion * 255) | 0;

    // Prepare token ring attributes
    const trConfig = CONFIG.Token.ringClass;
    const object = element.object.object || {};
    const ringColor = PIXI.Color.shared.setValue(object.ring?.ringColorLittleEndian ?? 0xFFFFFF).toNumber();
    const bkgColor = PIXI.Color.shared.setValue(object.ring?.bkgColorLittleEndian ?? 0xFFFFFF).toNumber();
    const ringUvsFloat = object.ring?.ringUVs ?? trConfig.tokenRingSamplerShader.nullUvs;
    const bkgUvsFloat = object.ring?.bkgUVs ?? trConfig.tokenRingSamplerShader.nullUvs;
    const states = (object.ring?.effects ?? 0) + 0.5;
    const scaleCorrection = object.ring?.scaleCorrection ?? 1;

    // Write attributes into buffer
    for ( let i = 0; i < vertexData.length; i += 2 ) {
      float32View[aIndex++] = vertexData[i];
      float32View[aIndex++] = vertexData[i + 1];
      float32View[aIndex++] = uvs[i];
      float32View[aIndex++] = uvs[i + 1];
      float32View[aIndex++] = ringUvsFloat[i];
      float32View[aIndex++] = ringUvsFloat[i + 1];
      float32View[aIndex++] = bkgUvsFloat[i];
      float32View[aIndex++] = bkgUvsFloat[i + 1];
      uint32View[aIndex++] = argb;
      uint32View[aIndex++] = ringColor;
      uint32View[aIndex++] = bkgColor;
      uint16View[aIndex << 1] = textureId;
      let k = (aIndex << 2) + 2;
      uint8View[k++] = unoccludedAlpha;
      uint8View[k++] = occludedAlpha;
      uint8View[k++] = occlusionElevation;
      uint8View[k++] = fadeOcclusion;
      uint8View[k++] = radialOcclusion;
      uint8View[k++] = visionOcclusion;
      aIndex += 2;
      float32View[aIndex++] = states;
      float32View[aIndex++] = scaleCorrection;
    }
  }

  /* ---------------------------------------- */

  /**
   * The batch vertex shader source. Subclasses can override it.
   * @type {string}
   * @protected
   */
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

  /**
   * The batch fragment shader source. Subclasses can override it.
   * @type {string}
   * @protected
   */
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
