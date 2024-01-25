/**
 * The common token ring fragment header glsl code
 * @type {string}
 */
export const TOKEN_RING_FRAG_HEADER = `        
  const uint STATE_DEACTIVATED = 0x00U;
  const uint STATE_ACTIVATED = 0x01U;
  const uint STATE_RING_PULSE = 0x02U;
  const uint STATE_RING_GRADIENT = 0x04U;
  const uint STATE_BKG_WAVE = 0x08U;
  const uint STATE_INVISIBLE = 0x10U;
  
  /* -------------------------------------------- */
    
  bool hasState() {
    return vStates > STATE_DEACTIVATED;
  }
  
  bool hasState(in uint state) {
    return (vStates & state) == state;
  }
  
  /* -------------------------------------------- */
  
  vec2 rotation(in vec2 uv, in float a) {
    uv -= 0.5;
    float s = sin(a);
    float c = cos(a);
    return uv * mat2(c, -s, s, c) + 0.5;
  }
  
  /* -------------------------------------------- */
  
  float normalizedCos(in float val) {
    return (cos(val) + 1.0) * 0.5;
  }
  
  /* -------------------------------------------- */
  
  float wave(in float dist) {
    float sinWave = 0.5 * (sin(-time * 4.0 + dist * 100.0) + 1.0);
    return mix(1.0, 0.55 * sinWave + 0.8, clamp(1.0 - dist, 0.0, 1.0));
  }
   
  /* -------------------------------------------- */
  
  vec4 colorizeTokenRing(in vec4 tokenRing, in float dist) {
    vec3 rcol = hasState(STATE_RING_PULSE) 
                ? mix(tokenRing.rrr, tokenRing.rrr * 0.35, (cos(time * 2.0) + 1.0) * 0.5)
                : tokenRing.rrr;
    vec3 ccol = vRingColor * rcol;            
    vec3 gcol = hasState(STATE_RING_GRADIENT)
            ? mix(ccol, vBackgroundColor * tokenRing.r, smoothstep(0.0, 1.0, dot(rotation(vTextureCoord, time), vec2(0.5))))
            : ccol;          
    vec4 col = vec4(mix(tokenRing.rgb, gcol, step(0.59, dist) - step(0.725, dist)), tokenRing.a);
    return col;
  }
  
  /* -------------------------------------------- */
  
  vec4 colorizeTokenBackground(in vec4 tokenBackground, in float dist) {
    float wave = hasState(STATE_BKG_WAVE) ? (0.6 + wave(dist) * 0.4) : 1.0;
    return tokenBackground * vec4(vBackgroundColor, 1.0) * wave;
  }
  
  /* -------------------------------------------- */
  
  vec4 processTokenColor(in vec4 finalColor) {
    if ( !hasState(STATE_INVISIBLE) || finalColor.a == 0.0 ) return finalColor;
    
    // Unmultiply rgb with alpha channel
    finalColor.rgb /= finalColor.a;
  
    // Computing halo
    float lum = perceivedBrightness(finalColor.rgb);
    vec3 haloColor = vec3(lum) * vec3(0.5, 1.0, 1.0);
    haloColor *= 2.0;

    // Construct final image
    return vec4(haloColor, 1.0)
                 * (0.55 + normalizedCos(time * 2.0) * 0.25) 
                 * finalColor.a;
  }
`;

/* -------------------------------------------- */

/**
 * The common token ring fragment main glsl code
 * @type {string}
 */
export const TOKEN_RING_FRAG_MAIN = `
  vec4 color;
  vec4 result;
  %forloop%
    
  if ( !hasState() ) result = color * vColor;
  else {
    vec4 tokenRingPix = texture(tokenRingTexture, vRingTextureCoord);
    vec4 tokenBackPix = texture(tokenRingTexture, vBackgroundTextureCoord);
    if ( tokenRingPix.a > 0.0 ) tokenRingPix.rgb /= tokenRingPix.a;
    if ( tokenBackPix.a > 0.0 ) tokenBackPix.rgb /= tokenBackPix.a;
    
    float dist = length(vTextureCoord - 0.5) * 2.0 * vScaleCorrection;
          
    tokenRingPix = colorizeTokenRing(tokenRingPix, dist);
    tokenBackPix = colorizeTokenBackground(tokenBackPix, dist);
    vec4 ringPix = vec4(mix(tokenBackPix.rgb, tokenRingPix.rgb, tokenRingPix.a), 
                       max(tokenBackPix.a, tokenRingPix.a)) * step(dist, 1.0);
    ringPix.rgb *= ringPix.a;
    vec4 tokenColor = processTokenColor(vec4(color.rgb * vColor.rgb, color.a));
    result = vec4(mix(ringPix.rgb, tokenColor.rgb, tokenColor.a), 
                  max(ringPix.a, tokenColor.a)) * vColor.a;
  }
`;
