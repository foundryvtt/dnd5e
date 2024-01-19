import {TOKEN_RING_FRAG_HEADER, TOKEN_RING_FRAG_MAIN} from "./parts/token-ring-shader-core.mjs";

/**
 * The token ring shader compatible with v11.
 */
export default class TokenRingSamplerShaderV11 extends BaseSamplerShader {

  /** @override */
  static classPluginName = "batchTokenRing";

  /* -------------------------------------------- */

  /** @override */
  get enabled() { return true; }

  set enabled(enabled) {}

  /* -------------------------------------------- */

  /** @override */
  static batchVertexSize = 15;

  /* -------------------------------------------- */

  /** @override */
  static reservedTextureUnits = 1;

  /* -------------------------------------------- */

  /**
   * A quad UVs array used for normalized position.
   * @type {Float32Array}
   */
  static quadUvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);

  /**
   * A null UVs array used for nulled texture position.
   * @type {Float32Array}
   */
  static nullUvs = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]);

  /* -------------------------------------------- */

  /** @override */
  static batchDefaultUniforms(maxTex) {
    return {
      tokenRingTexture: maxTex,
      time: 0
    };
  }

  /* -------------------------------------------- */

  /** @override */
  static _preRenderBatch(batchRenderer) {
    batchRenderer.renderer.texture.bind(game.dnd5e.tokenRings.baseTexture, batchRenderer.uniforms.tokenRingTexture);
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
            .addAttribute("aNormalizedPosition", this._buffer, 2, false, PIXI.TYPES.FLOAT)
            .addAttribute("aColor", this._buffer, 4, true, PIXI.TYPES.UNSIGNED_BYTE)
            .addAttribute("aRingColor", this._buffer, 4, true, PIXI.TYPES.UNSIGNED_BYTE)
            .addAttribute("aBackgroundColor", this._buffer, 4, true, PIXI.TYPES.UNSIGNED_BYTE)
            .addAttribute("aTextureId", this._buffer, 1, true, PIXI.TYPES.FLOAT)
            .addAttribute("aStates", this._buffer, 1, false, PIXI.TYPES.FLOAT)
            .addIndex(this._indexBuffer);
        }
      };
  }

  /* ---------------------------------------- */

  /** @override */
  static _packInterleavedGeometry(element, attributeBuffer, indexBuffer, aIndex, iIndex) {
    const {uint32View, float32View} = attributeBuffer;

    const packedVertices = aIndex / this.vertexSize;
    const uvs = element.uvs;
    const indices = element.indices;
    const vertexData = element.vertexData;
    const textureId = element._texture.baseTexture._batchLocation;
    const argb = element._tintRGB + (element.worldAlpha * 255 << 24);

    // Prepare token ring attributes
    const trConfig = game.dnd5e.tokenRings;
    const object = element.object.object || {};
    const hasTokenRing = !!object.tokenRing;
    const ringName = object.tokenRing?.ringName;
    const bkgName = object.tokenRing?.bkgName;
    const ringColor = (object.tokenRing?.ringColorLittleEndian ?? 0xFFFFFF) + 0xFF000000;
    const bkgColor = (object.tokenRing?.bkgColorLittleEndian ?? 0xFFFFFF) + 0xFF000000;
    const ringUvsFloat = trConfig.texturesUvs[ringName] ?? trConfig.tokenRingSamplerShader.nullUvs;
    const bkgUvsFloat = trConfig.texturesUvs[bkgName] ?? trConfig.tokenRingSamplerShader.nullUvs;
    const normalizedUvsFloat = trConfig.tokenRingSamplerShader.quadUvs;
    const states = (hasTokenRing ? object.tokenRing.effects + 0.5 : 0.5);


    for ( let i = 0; i < vertexData.length; i += 2 ) {
      float32View[aIndex++] = vertexData[i];
      float32View[aIndex++] = vertexData[i + 1];
      float32View[aIndex++] = uvs[i];
      float32View[aIndex++] = uvs[i + 1];
      float32View[aIndex++] = ringUvsFloat[i];
      float32View[aIndex++] = ringUvsFloat[i + 1];
      float32View[aIndex++] = bkgUvsFloat[i];
      float32View[aIndex++] = bkgUvsFloat[i + 1];
      float32View[aIndex++] = normalizedUvsFloat[i];
      float32View[aIndex++] = normalizedUvsFloat[i + 1];
      uint32View[aIndex++] = argb;
      uint32View[aIndex++] = ringColor;
      uint32View[aIndex++] = bkgColor;
      float32View[aIndex++] = textureId;
      float32View[aIndex++] = states;
    }

    for ( let i = 0; i < indices.length; i++ ) {
      indexBuffer[iIndex++] = packedVertices + indices[i];
    }
  }

  /* ---------------------------------------- */

  /** @override */
  static batchVertexShader = `
    #version 300 es
    precision ${PIXI.settings.PRECISION_VERTEX} float;
    in vec2 aVertexPosition;
    in vec2 aTextureCoord;
    in vec4 aColor;
    in float aTextureId;
    in vec2 aRingTextureCoord;
    in vec2 aBackgroundTextureCoord;
    in vec2 aNormalizedPosition;
    in vec4 aRingColor;
    in vec4 aBackgroundColor;
    in float aStates;
    
    uniform mat3 projectionMatrix;
    uniform mat3 translationMatrix;
    uniform vec4 tint;
    
    out vec2 vTextureCoord;
    out vec2 vRingTextureCoord;
    out vec2 vBackgroundTextureCoord;
    out vec2 vNormalizedPosition;
    flat out vec4 vColor;
    flat out float vTextureId;
    flat out vec3 vRingColor;
    flat out vec3 vBackgroundColor;
    flat out uint vStates;
    flat out float vGauge1;
    flat out float vGauge2;
    
    void main(void) {
      vec3 tPos = translationMatrix * vec3(aVertexPosition, 1.0);
      vTextureCoord = aTextureCoord;
      vTextureId = aTextureId;
      vColor = aColor * tint;
      vRingTextureCoord = aRingTextureCoord;
      vBackgroundTextureCoord = aBackgroundTextureCoord;
      vNormalizedPosition = aNormalizedPosition;
      vRingColor = aRingColor.rgb;
      vBackgroundColor = aBackgroundColor.rgb;
      vStates = uint(aStates);
      vGauge1 = aRingColor.a;
      vGauge2 = aBackgroundColor.a;
      gl_Position = vec4((projectionMatrix * tPos).xy, 0.0, 1.0);
    }
  `;

  /* -------------------------------------------- */

  /** @override */
  static batchFragmentShader = `
    #version 300 es
    precision ${PIXI.settings.PRECISION_FRAGMENT} float;
    
    in vec2 vTextureCoord;
    in vec2 vRingTextureCoord;
    in vec2 vBackgroundTextureCoord;
    in vec2 vNormalizedPosition;
    
    flat in vec4 vColor;
    flat in float vTextureId;
    flat in vec3 vRingColor;
    flat in vec3 vBackgroundColor;
    flat in uint vStates;
    flat in float vGauge1;
    flat in float vGauge2;
 
    uniform sampler2D uSamplers[%count%];  
    uniform sampler2D tokenRingTexture;
    uniform float time;
    
    out vec4 fragColor;
    
    #define texture2D texture
    
    ${this.CONSTANTS}
    ${this.PERCEIVED_BRIGHTNESS}
    ${TOKEN_RING_FRAG_HEADER}
    
    /* -------------------------------------------- */
    
    void main(void) {
      ${TOKEN_RING_FRAG_MAIN}
      fragColor = result;
    }
  `;
}
