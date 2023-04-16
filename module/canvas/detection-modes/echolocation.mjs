/**
 * The detection mode for Echolocation.
 */
export class DetectionModeEcholocation extends DetectionMode {
  constructor() {
    super({
      id: "echolocation",
      label: "DND5E.Echolocation",
      type: DetectionMode.DETECTION_TYPES.SOUND,
      walls: true
    });
  }

  /** @override */
  static getDetectionFilter() {
    return this._detectionFilter ??= OutlineOverlayFilter.create({
      outlineColor: [1, 1, 1, 1],
      knockout: true,
      wave: true
    });
  }

  /** @override */
  _canDetect(visionSource, target) {
    // Echolocation doesn't work while deafened.
    const source = visionSource.object;
    return !(source instanceof Token && source.document.hasStatusEffect(CONFIG.specialStatusEffects.DEAF));
  }

  /** @override */
  _testLOS(visionSource, mode, target, test) {
    // Echolocation is directional and therefore limited by the vision angle.
    if (!this.#testAngle(visionSource, test.point)) return false;
    // Echolocation is blocked by total cover.
    const polygonBackend = foundry.utils.isNewerVersion(game.version, 11)
      ? CONFIG.Canvas.polygonBackends.sight
      : CONFIG.Canvas.losBackend;
    return !polygonBackend.testCollision(
      { x: visionSource.x, y: visionSource.y },
      test.point,
      {
        type: "sight",
        mode: "any",
        source: visionSource,
        wallDirectionMode: ClockwiseSweepPolygon.WALL_DIRECTION_MODES.BOTH,
        useThreshold: false
      }
    );
  }

  /**
   * Test whether the point is inside the vision cone.
   * @param {VisionSource} visionSource
   * @param {PIXI.Point} point
   * @returns {boolean}
   */
  #testAngle(visionSource, point) {
    const { angle, rotation, externalRadius } = visionSource.data;

    if (angle !== 360) {
      const dx = point.x - visionSource.x;
      const dy = point.y - visionSource.y;

      if ((dx * dx) + (dy * dy) > externalRadius * externalRadius) {
        const aMin = rotation + 90 - (angle / 2);
        const a = Math.toDegrees(Math.atan2(dy, dx));

        if ((((a - aMin) % 360) + 360) % 360 > angle) {
          return false;
        }
      }
    }

    return true;
  }
}

CONFIG.specialStatusEffects.DEAF = "deaf";
CONFIG.Canvas.detectionModes.echolocation = new DetectionModeEcholocation();
