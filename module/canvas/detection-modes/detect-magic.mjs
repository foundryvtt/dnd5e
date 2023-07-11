/**
 * The detection mode for Detect Magic.
 */
export class DetectionModeDetectMagic extends DetectionMode {
  constructor() {
    super({
      id: "detectMagic",
      label: "DND5E.DetectMagic",
      type: DetectionMode.DETECTION_TYPES.OTHER,
      walls: false
    });
  }

  /** @override */
  static getDetectionFilter() {
    return this._detectionFilter ??= GlowOverlayFilter.create({
      glowColor: [1, 0, 1, 1]
    });
  }

  #counter = 0;

  #hooked = false;

  /** @override */
  testVisibility(visionSource, mode, config) {
    if (!mode.enabled) return false;

    if (!this.#hooked) {
      const hooks = {};
      const refreshVision = () => {
        canvas.perception.update({ refreshVision: true }, true);
      };

      for (const hook of [
        "createItem",
        "updateItem",
        "deleteItem",
        "createActiveEffect",
        "updateActiveEffect",
        "deleteActiveEffect"
      ]) {
        hooks[hook] = Hooks.on(hook, refreshVision);
      }

      let counter = this.#counter;

      hooks.sightRefresh = Hooks.on("sightRefresh", () => {
        if (counter === this.#counter) {
          // The detection mode hasn't been used since the last refresh.
          for (const [hook, id] of Object.entries(hooks)) {
            Hooks.off(hook, id);
          }

          this.#hooked = false;
        } else {
          // The detection mode has been used.
          counter = this.#counter;
        }
      });

      this.#hooked = true;
    }

    this.#counter++;

    return super.testVisibility(visionSource, mode, config);
  }

  /** @override */
  _canDetect(visionSource, target) {
    if (!(target instanceof Token)) return false;
    const actor = target.actor;
    if (!actor) return false;

    const isMagical = item => {
      const type = item.type;
      return (type === "consumable"
        || type === "container"
        || type === "equipment"
        || type === "loot"
        || type === "tool"
        || type === "weapon")
        && !!item.system.rarity;
    };

    // Does the target carry a magical item?
    if (actor.items.some(isMagical)) {
      return true;
    }

    // Is the target affect by a spell?
    for (const effect of actor.effects) {
      if (effect.disabled || effect.isSuppressed) continue;
      const item = effect.origin && !effect.origin.startsWith("Compendium.")
        ? fromUuidSync(effect.origin) : null;
      if (item instanceof Item && (item.type === "spell" || isMagical(item))) {
        return true;
      }
    }

    return false;
  }
}

CONFIG.Canvas.detectionModes.detectMagic = new DetectionModeDetectMagic();
