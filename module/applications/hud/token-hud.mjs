import ActiveEffect5e from "../../documents/active-effect.mjs";
import ConditionData from "../../data/active-effect/condition.mjs";

export default class TokenHUD5e extends foundry.applications.hud.TokenHUD {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      effect: {
        handler: TokenHUD5e.#onToggleEffect,
        buttons: [0, 2]
      }
    }
  };

  /* -------------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#adjustConditionIcons();
  }

  /* -------------------------------------------------- */

  /**
   * Replace condition icons with leveled icons.
   */
  #adjustConditionIcons() {
    const actor = this.object.actor;
    if ( !actor ) return;

    const conditions = actor.effects.documentsByType.condition;
    for ( const c of conditions ) {
      if ( !c.system.hasLevels ) continue;
      const { level, type } = c.system;
      const img = ConditionData.getIconByLevel(type, level);
      const icon = this.element.querySelector(`[data-status-id="${type}"]`);
      if ( !icon ) continue;
      icon.style.objectPosition = "-100px";
      icon.style.background = `url("${img}") no-repeat center / contain`;
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Toggle a condition via the HUD.
   * @param {PointerEvent} event    The triggering event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static async #onToggleEffect(event, target) {
    if ( !this.actor ) {
      ui.notifications.warn("HUD.WarningEffectNoActor", { localize: true });
      return;
    }

    const id = target.dataset.statusId;

    let resolved = false;
    if ( id === "concentrating" ) resolved = ActiveEffect5e._manageConcentration(event, this.actor);

    if ( !resolved ) this.actor.toggleStatusEffect(id, {
      overlay: event.button === 2,
      levels: event.button === 0 ? 1 : -1
    });
  }
}
