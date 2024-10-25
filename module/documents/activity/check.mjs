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
  _usageChatButtons(message) {
    const buttons = [];
    const dc = this.check.dc.value;

    const createButton = (abilityKey, associated) => {
      const ability = CONFIG.DND5E.abilities[abilityKey]?.label;
      const checkType = (associated in CONFIG.DND5E.skills) ? "skill"
        : (associated in CONFIG.DND5E.toolIds) ? "tool": "ability";
      const dataset = { ability: abilityKey, action: "rollCheck", visibility: "all" };
      if ( dc ) dataset.dc = dc;
      if ( checkType !== "ability" ) dataset[checkType] = associated;

      let label = ability;
      let type;
      if ( checkType === "skill" ) type = CONFIG.DND5E.skills[associated]?.label;
      else if ( checkType === "tool" ) type = Trait.keyLabel(associated, { trait: "tool" });
      if ( type ) label = game.i18n.format("EDITOR.DND5E.Inline.SpecificCheck", { ability, type });
      else label = ability;

      buttons.push({
        label: dc ? `
          <span class="visible-dc">${game.i18n.format("EDITOR.DND5E.Inline.DC", { dc, check: wrap(label) })}</span>
          <span class="hidden-dc">${wrap(label)}</span>
        ` : wrap(label),
        icon: checkType === "tool" ? '<i class="fa-solid fa-hammer" inert></i>'
          : '<i class="dnd5e-icon" data-src="systems/dnd5e/icons/svg/ability-score-improvement.svg" inert></i>',
        dataset
      });
    };
    const wrap = check => game.i18n.format("EDITOR.DND5E.Inline.CheckShort", { check });

    const associated = Array.from(this.check.associated);
    if ( !associated.length && (this.item.type === "tool") ) associated.push(this.item.system.type.baseItem);
    if ( associated.length ) associated.forEach(a => {
      const ability = this.getAbility(a);
      if ( ability ) createButton(ability, a);
    });
    else if ( this.check.ability ) createButton(this.check.ability);

    return buttons.concat(super._usageChatButtons(message));
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
    let { ability, dc, skill, tool } = target.dataset;
    dc = parseInt(dc);
    const data = { event, targetValue: Number.isFinite(dc) ? dc : this.check.dc.value };

    for ( const token of targets ) {
      data.speaker = ChatMessage.getSpeaker({ scene: canvas.scene, token: token.document });
      if ( skill ) {
        await token.actor.rollSkill(skill, { ...data, ability });
      } else if ( tool ) {
        const checkData = { ...data, ability };
        if ( (this.item.type === "tool") && !this.check.associated.size ) {
          checkData.bonus = this.item.system.bonus;
          checkData.prof = this.item.system.prof;
          checkData.item = this.item;
        }
        await token.actor.rollToolCheck(tool, checkData);
      } else {
        await token.actor.rollAbilityCheck({
          ability,
          target: data.targetValue
        }, {}, { data: { speaker: data.speaker } });
      }
    }
  }
}
