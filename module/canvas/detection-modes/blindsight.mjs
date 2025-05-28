/**
 * The detection mode for Blindsight.
 */
export class DetectionModeBlindsight extends foundry.canvas.perception.DetectionMode {
  constructor() {
    super({
      id: "blindsight",
      label: "DND5E.SenseBlindsight",
      type: (foundry.canvas?.perception?.DetectionMode ?? DetectionMode).DETECTION_TYPES.OTHER,
      walls: true,
      angle: false
    });
  }

  /* -------------------------------------------- */

  /** @override */
  static getDetectionFilter() {
    return this._detectionFilter ??= OutlineOverlayFilter.create({
      outlineColor: [1, 1, 1, 1],
      knockout: true,
      wave: true
    });
  }

  /* -------------------------------------------- */

  /** @override */
  _canDetect(visionSource, target) {
    if ( visionSource.object.document.hasStatusEffect(CONFIG.specialStatusEffects.BURROW) ) return false;
    if ( target instanceof foundry.canvas.placeables.Token ) {
      if ( target.document.hasStatusEffect(CONFIG.specialStatusEffects.BURROW) ) return false;
    }
    return true;
  }

  /* -------------------------------------------- */

  /** @override */
  _testLOS(visionSource, mode, target, test) {
    return !CONFIG.Canvas.polygonBackends.sight.testCollision(
      { x: visionSource.x, y: visionSource.y },
      test.point,
      {
        type: "sight",
        mode: "any",
        source: visionSource,
        // Blindsight is restricted by total cover and therefore cannot see
        // through windows. So we do not want blindsight to see through
        // a window as we get close to it. That's why we ignore thresholds.
        // We make the assumption that all windows are configured as threshold
        // walls. A move-based visibility check would also be an option to check
        // for total cover, but this would have the undesirable side effect that
        // blindsight wouldn't work through fences, portcullises, etc.
        useThreshold: false
      }
    );
  }
}

CONFIG.Canvas.detectionModes.blindsight = new DetectionModeBlindsight();
