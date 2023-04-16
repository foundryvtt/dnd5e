/**
 * The detection mode for Detect Thoughts.
 */
export class DetectionModeDetectThoughts extends DetectionMode {
  constructor() {
    super({
      id: "detectThoughts",
      label: "DND5E.DetectThoughts",
      type: DetectionMode.DETECTION_TYPES.OTHER,
      walls: false
    });
  }

  /** @override */
  static getDetectionFilter() {
    return this._detectionFilter ??= GlowOverlayFilter.create({
      glowColor: [0, 1, 1, 1]
    });
  }

  /** @override */
  _canDetect(visionSource, target) {
    if (!(target instanceof Token)) return false;
    const actor = target.actor;
    // A thinking creature is a creature that has an Intelligence of 4 or higher and speaks at least one language.
    return actor && (actor.type === "character" || actor.type === "npc")
      && actor.system.abilities.int.value > 3
      && (actor.system.traits.languages.value.size > 0 || actor.system.traits.languages.custom);
  }
}

CONFIG.Canvas.detectionModes.detectThoughts = new DetectionModeDetectThoughts();
