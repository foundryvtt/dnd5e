import MacroSheet from "../../applications/activity/macro-sheet.mjs";
import BaseMacroActivityData from "../../data/activity/macro-data.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for executing a Macro when an item is used.
 */
export default class MacroActivity extends ActivityMixin(BaseMacroActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.MACRO"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "macro",
      img: "systems/dnd5e/icons/svg/activity/macro.svg",
      title: "DND5E.MACRO.Title",
      hint: "DND5E.MACRO.Hint",
      sheetClass: MacroSheet,
      usage: {
        actions: {
          executeMacro: MacroActivity.#executeMacro
        }
      }
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /** @override */
  _usageChatButtons(message) {
    if ( !this.macro.uuid || !this.macro.chatButton ) return super._usageChatButtons(message);
    return [{
      label: _loc("DND5E.MACRO.Action.Execute"),
      icon: '<i class="fa-solid fa-code" inert></i>',
      dataset: {
        action: "executeMacro"
      }
    }].concat(super._usageChatButtons(message));
  }

  /* -------------------------------------------- */

  /** @override */
  async _triggerSubsequentActions(config, results) {
    if ( this.macro.uuid && !this.macro.chatButton ) await this.executeMacro({ message: results.message });
  }

  /* -------------------------------------------- */

  /**
   * Execute the macro attached to this activity.
   * @param {object} [options={}]
   * @param {Event} [options.event]            Triggering event, if any.
   * @param {ChatMessage5e} [options.message]  Usage chat message associated with the activation, if any.
   * @returns {Promise<any>}                   Return value of the executed macro.
   */
  async executeMacro({ event, message }={}) {
    const macro = await fromUuid(this.macro.uuid);
    if ( !macro ) {
      ui.notifications.warn("DND5E.MACRO.Warning.MissingMacro", { format: { activity: this.name } });
      return;
    }
    if ( !macro.canExecute ) {
      ui.notifications.error("DND5E.MACRO.Warning.CannotExecute");
      return;
    }
    try {
      return await macro.execute({
        actor: this.actor,
        item: this.item,
        activity: this,
        token: this.getUsageToken(),
        event,
        message,
        targets: Array.from(game.user.targets)
      });
    } catch(err) {
      Hooks.onError("MacroActivity#executeMacro", err, { log: "error", notify: "error" });
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle executing the macro attached to this activity.
   * @this {MacroActivity}
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   */
  static #executeMacro(event, target, message) {
    this.executeMacro({ event, message });
  }
}
