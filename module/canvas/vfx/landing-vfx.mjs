/**
 * @import TokenDocument5e from "../documents/token.mjs";
 */

/**
 * Tint particles so that they look like dust.
 * @type {number[]}
 */
const DUST_TINTS = [0x6B5238, 0x4A3826, 0x2A1E14];

/* -------------------------------------------- */

/**
 * Play a dust-burst and camera shake when a token lands after a plummet.
 * @param {TokenDocument5e} token  The token that just landed.
 * @param {number} distance        The distance fallen, in scene grid units.
 * @returns {Promise<boolean>|void}
 */
export function playLandingVfx(token, distance) {
  if ( !canvas.ready || !CONFIG.Canvas.vfx?.enabled ) return;
  if ( (distance <= 0) || matchMedia("(prefers-reduced-motion: reduce)").matches ) return;

  const center = token.getCenterPoint();
  const gridSize = canvas.grid?.size ?? 100;
  const sceneUnitPx = gridSize / (canvas.dimensions?.distance || 5);
  const distancePx = distance * sceneUnitPx;
  const tokenSize = Math.max(token.width, token.height) * gridSize;

  const radius = Math.clamp((tokenSize * .5) + (distancePx * .05), 40, 200);
  const count = Math.clamp(2_500 + Math.floor(distance * 60), 2_500, 10_000);
  const shake = {
    amp: Math.clamp(distance * .4, 0, 18),
    ms: Math.clamp(180 + (distance * 4), 180, 600)
  };
  shake.enabled = shake.amp > 1;

  const components = {
    dust: {
      count,
      area: { reference: "burst" },
      config: {
        alpha: [.95, 1],
        manual: false,
        onSpawn: p => {
          p.texture = PIXI.Texture.WHITE;
          p.tint = DUST_TINTS[(Math.random() * DUST_TINTS.length) | 0];
        },
        rotation: [0, 360],
        velocity: { angle: [0, 360], speed: [10, 50] }
      },
      duration: 200,
      fade: { in: 50, out: 400 },
      initial: 1,
      lifetime: { max: 950, min: 450 },
      mode: "effect",
      // PIXI.Texture.WHITE is 16x16, so rendered size = scale * 16. This range yields ~1-2 px grains.
      scale: { max: .15, min: .1 },
      // Required to satisfy VFXParticleGeneratorComponent's 'no valid textures' guard. The actual texture used at
      // render time is set per-particle to PIXI.Texture.WHITE in `config.onSpawn`.
      textures: ["ui/particles/snow.png"],
      type: "particleGenerator"
    }
  };
  const timeline = [{ component: "dust", position: 0 }];

  if ( shake.enabled ) {
    components.shake = {
      duration: shake.ms,
      maxDisplacement: shake.amp,
      smoothness: .5,
      target: "stage",
      type: "shake"
    };
    timeline.push({ component: "shake", position: 0 });
  }

  const effect = new foundry.canvas.vfx.VFXEffect({ components, timeline, name: "dnd5e.landingDust" });
  return effect.play({ burst: { radius, x: center.x, y: center.y } });
}
