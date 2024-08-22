import CheckSheet from "../../applications/activity/check-sheet.mjs";
import CheckActivityData from "../../data/activity/check-data.mjs";
import * as Trait from "../../documents/actor/trait.mjs";
import { getSceneTargets } from "../../utils.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for making ability checks.
 */
export default class CheckActivity extends ActivityMixin(CheckActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.CHECK"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "check",
      img: "systems/dnd5e/icons/svg/activity/check.svg",
      title: "DND5E.CHECK.Title",
      sheetClass: CheckSheet,
      usage: {
        actions: {
          rollCheck: CheckActivity.#rollCheck
        }
      }
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /** @override */
  _usageChatButtons() {
    const ability = CONFIG.DND5E.abilities[this.check.ability]?.label ?? "";
    const dc = this.check.dc.value;

    let label = ability;
    let type;
    if ( this.checkType === "skill" ) type = CONFIG.DND5E.skills[this.check.associated]?.label;
    else if ( this.checkType === "tool" ) type = Trait.keyLabel(this.check.associated, { trait: "tool" });
    if ( type ) label = game.i18n.format("EDITOR.DND5E.Inline.SpecificCheck", { ability, type });
    else label = ability;
    const wrap = check => game.i18n.format("EDITOR.DND5E.Inline.CheckShort", { check });

    return [{
      label: dc ? `
        <span class="visible-dc">${game.i18n.format("EDITOR.DND5E.Inline.DC", { dc, check: wrap(label) })}</span>
        <span class="hidden-dc">${wrap(label)}</span>
      ` : wrap(label),
      icon: this.checkType === "tool" ? '<i class="fa-solid fa-hammer" inert></i>'
        : '<i class="dnd5e-icon" data-src="systems/dnd5e/icons/svg/ability-score-improvement.svg" inert></i>',
      dataset: {
        ability: this.check.ability, dc: dc || undefined,
        action: "rollCheck",
        visibility: "all"
      }
    }].concat(super._usageChatButtons());
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle performing an ability check.
   * @this {CheckActivity}
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   */
  static async #rollCheck(event, target, message) {
    const targets = getSceneTargets();
    if ( !targets.length ) ui.notifications.warn("DND5E.ActionWarningNoToken", { localize: true });
    const dc = parseInt(target.dataset.dc);
    const data = { event, targetValue: Number.isFinite(dc) ? dc : this.check.dc.value };
    for ( const token of targets ) {
      data.speaker = ChatMessage.getSpeaker({ scene: canvas.scene, token: token.document });
      switch ( this.checkType ) {
        case "ability":
          await token.actor.rollAbilityTest(this.check.ability, data);
          break;
        case "skill":
          await token.actor.rollSkill(this.check.associated, { ...data, ability: this.check.ability });
          break;
        case "tool":
          const checkData = { ...data, ability: this.check.ability };
          if ( (this.item.type === "tool") && !this._source.check.associated ) {
            checkData.bonus = this.item.system.bonus;
            checkData.prof = this.item.system.prof;
          }
          await token.actor.rollToolCheck(this.check.associated, checkData);
          break;
      }
    }
  }
}
