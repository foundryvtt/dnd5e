/**
 * The detection mode for See Invisibility.
 */
export class DetectionModeSeeInvisibility extends DetectionMode {
  constructor() {
    super({
      id: "seeInvisibility",
      label: "DETECTION.SeeInvisibility",
      type: DetectionMode.DETECTION_TYPES.SIGHT,
      walls: false,
      angle: false
    });
  }

  /** @override */
  static getDetectionFilter() {
    return this._detectionFilter ??= GlowOverlayFilter.create({
      glowColor: [0, 0.60, 0.33, 1]
    });
  }

  /** @override */
  _canDetect(visionSource, target) {
    // Only invisible tokens can be detected.
    return target instanceof Token && target.document.hasStatusEffect(CONFIG.specialStatusEffects.INVISIBLE);
  }

  /** @override */
  _testPoint(visionSource, mode, target, test) {
    if (!super._testPoint(visionSource, mode, target, test)) {
      return false;
    }

    const visionSources = this.#removeOtherVisionSources(visionSource);
    const detectionsModes = this.#removeNonSightDetectionModes(visionSource);
    const activeEffects = this.#removeInvisibleStatusEffects(target);

    // Test whether this vision source sees the target without the invisible status effect.
    const isVisible = canvas.effects.visibility.testVisibility(test.point, { tolerance: 0, object: target });

    this.#restoreOtherVisionSources(visionSources);
    this.#restoreNonSightDetectionModes(visionSource, detectionsModes);
    this.#restoreInvisibleStatusEffects(target, activeEffects);

    return isVisible;
  }

  /**
   * Temporarily remove other vision sources.
   * @param {VisionSource} visionSource             The vision source.
   * @returns {Collection<string, VisionSource>}    The vision sources that need to be restored later.
   */
  #removeOtherVisionSources(visionSource) {
    const visionSources = canvas.effects.visionSources;

    canvas.effects.visionSources = new foundry.utils.Collection();
    canvas.effects.visionSources.set("", visionSource);

    return visionSources;
  }

  /**
   * Restore the vision sources.
   * @param {Collection<string, VisionSource>} visionSources    The vision sources that need to be restored.
   */
  #restoreOtherVisionSources(visionSources) {
    canvas.effects.visionSources = visionSources;
  }

  /**
   * Temporarily remove all detection modes that are not sight-based from the source token.
   * @param {VisionSource} visionSource      The vision source.
   * @returns {TokenDetectionMode[]|null}    The detection modes that need to be restored later.
   */
  #removeNonSightDetectionModes(visionSource) {
    const object = visionSource.object;
    let detectionModes = null;

    if (object instanceof Token) {
      const document = object.document;

      detectionModes = document.detectionModes;
      document.detectionModes = detectionModes.filter(
        m => CONFIG.Canvas.detectionModes[m.id]?.type === DetectionMode.DETECTION_TYPES.SIGHT
      );
    }

    return detectionModes;
  }

  /**
   * Restore the detection modes.
   * @param {VisionSource} visionSource                   The vision source.
   * @param {TokenDetectionMode[]|null} detectionModes    The detection modes that need to be restored.
   */
  #restoreNonSightDetectionModes(visionSource, detectionModes) {
    if (detectionModes) {
      visionSource.object.document.detectionModes = detectionModes;
    }
  }

  /**
   * Temporarily remove the invisible status effects from the target token.
   * @param {Token} target                           The target token.
   * @returns {ActiveEffect[]|string[]|undefined}    The effects that need to be restored later.
   */
  #removeInvisibleStatusEffects(target) {
    const document = target.document;
    const statusId = CONFIG.specialStatusEffects.INVISIBLE;
    let effects;

    // See TokenDocument.hasStatusEffect
    if (!document.actor) {
      const icon = CONFIG.statusEffects.find(e => e.id === statusId)?.icon;

      effects = document.effects;
      document.effects = effects.filter(e => e !== icon);
    } else if (foundry.utils.isNewerVersion(game.version, 11)) {
      document.actor.statuses.delete(statusId);
    } else {
      effects = document.actor.effects.filter(e => !e.disabled && e.getFlag("core", "statusId") === statusId);

      for (const effect of effects) {
        effect.disabled = true;
      }
    }

    return effects;
  }

  /**
   * Restore the status effects.
   * @param {Token} target                                 The target token.
   * @param {ActiveEffect[]|string[]|undefined} effects    The effects that need to be restored.
   */
  #restoreInvisibleStatusEffects(target, effects) {
    const document = target.document;

    if (!document.actor) {
      document.effects = effects;
    } else if (foundry.utils.isNewerVersion(game.version, 11)) {
      document.actor.statuses.add(CONFIG.specialStatusEffects.INVISIBLE);
    } else {
      for (const effect of effects) {
        effect.disabled = false;
      }
    }
  }
}

CONFIG.Canvas.detectionModes.seeInvisibility = new DetectionModeSeeInvisibility();
