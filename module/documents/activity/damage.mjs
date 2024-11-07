import DamageSheet from "../../applications/activity/damage-sheet.mjs";
import DamageActivityData from "../../data/activity/damage-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for rolling damage.
 */
export default class DamageActivity extends ActivityMixin(DamageActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.DAMAGE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "damage",
      img: "systems/dnd5e/icons/svg/activity/damage.svg",
      title: "DND5E.DAMAGE.Title",
      sheetClass: DamageSheet,
      usage: {
        actions: {
          rollDamage: DamageActivity.#rollDamage
        }
      }
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /** @override */
  _usageChatButtons(message) {
    if ( !this.damage.parts.length ) return super._usageChatButtons(message);
    return [{
      label: game.i18n.localize("DND5E.Damage"),
      icon: '<i class="fa-solid fa-burst" inert></i>',
      dataset: {
        action: "rollDamage"
      }
    }].concat(super._usageChatButtons(message));
  }

  /* -------------------------------------------- */

  /** @override */
  async _triggerSubsequentActions(config, results) {
    this.rollDamage({ event: config.event }, {}, { data: { "flags.dnd5e.originatingMessage": results.message?.id } });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle performing a damage roll.
   * @this {DamageActivity}
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   */
  static #rollDamage(event, target, message) {
    this.rollDamage({ event });
  }
}
