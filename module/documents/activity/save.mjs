import SaveSheet from "../../applications/activity/save-sheet.mjs";
import SaveActivityData from "../../data/activity/save-data.mjs";
import { getSceneTargets } from "../../utils.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for making saving throws and rolling damage.
 */
export default class SaveActivity extends ActivityMixin(SaveActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.SAVE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "save",
      img: "systems/dnd5e/icons/svg/activity/save.svg",
      title: "DND5E.SAVE.Title.one",
      sheetClass: SaveSheet,
      usage: {
        actions: {
          rollDamage: SaveActivity.#rollDamage,
          rollSave: SaveActivity.#rollSave
        }
      }
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /** @override */
  _usageChatButtons() {
    const ability = CONFIG.DND5E.abilities[this.save.ability]?.label ?? "";
    const dc = this.save.dc.value;
    const buttons = [{
      label: `
        <span class="visible-dc">${game.i18n.format("DND5E.SavingThrowDC", { dc, ability })}</span>
        <span class="hidden-dc">${game.i18n.format("DND5E.SavePromptTitle", { ability })}</span>
      `,
      icon: '<i class="fa-solid fa-shield-heart" inert></i>',
      dataset: {
        ability, dc,
        action: "rollSave",
        visibility: "all"
      }
    }];
    if ( this.damage.parts.length ) buttons.push({
      label: game.i18n.localize("DND5E.Damage"),
      icon: '<i class="fas fa-burst" inert></i>',
      dataset: {
        action: "rollDamage"
      }
    });
    return buttons.concat(super._usageChatButtons());
  }

  /* -------------------------------------------- */
  /*  Rolling                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async rollDamage(config={}, dialog={}, message={}) {
    message = foundry.utils.mergeObject({
      "data.flags.dnd5e.roll": {
        damageOnSave: this.damage.onSave
      }
    }, message);
    return super.rollDamage(config, dialog, message);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle performing a damage roll.
   * @this {SaveActivity}
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   */
  static #rollDamage(event, target, message) {
    this.rollDamage({ event });
  }

  /* -------------------------------------------- */

  /**
   * Handle performing a saving throw.
   * @this {SaveActivity}
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   */
  static async #rollSave(event, target, message) {
    const targets = getSceneTargets();
    if ( !targets.length ) ui.notifications.warn("DND5E.ActionWarningNoToken", { localize: true });
    const dc = parseInt(target.dataset.dc);
    for ( const token of targets ) {
      const speaker = ChatMessage.getSpeaker({ scene: canvas.scene, token: token.document });
      await token.actor.rollAbilitySave(target.dataset.ability ?? this.save.ability, {
        event, speaker, targetValue: Number.isFinite(dc) ? dc : this.save.dc.value
      });
    }
  }
}
