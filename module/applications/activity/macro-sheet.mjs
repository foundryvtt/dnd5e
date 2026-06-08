import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the macro activity.
 */
export default class MacroSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["macro-activity"],
    actions: {
      removeMacro: MacroSheet.#removeMacro
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: "systems/dnd5e/templates/activity/macro-effect.hbs",
      templates: super.PARTS.effect.templates
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    return {
      ...await super._prepareContext(options),
      macro: this.activity.macro.uuid ? await fromUuid(this.activity.macro.uuid) : null
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context, options) {
    context = await super._prepareEffectContext(context, options);
    if ( context.macro ) context.contentLink = context.macro.toAnchor().outerHTML;
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareIdentityContext(context, options) {
    context = await super._prepareIdentityContext(context, options);
    context.behaviorFields.push({
      field: context.fields.macro.fields.chatButton,
      value: context.source.macro.chatButton,
      input: context.inputs.createCheckboxInput
    });
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getTabs() {
    const tabs = super._getTabs();
    tabs.effect.label = "DND5E.MACRO.SECTIONS.Macro";
    tabs.effect.icon = "fa-solid fa-scroll";
    return tabs;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle removing the associated macro.
   * @this {MacroSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #removeMacro(event, target) {
    this.activity.update({ "macro.uuid": null });
  }
}
