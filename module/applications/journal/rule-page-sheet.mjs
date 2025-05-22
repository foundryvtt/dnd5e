const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * Journal entry page that displays a controls for editing rule page tooltip & type.
 */
export default class JournalRulePageSheet extends foundry.appv1.sheets.JournalTextPageSheet {

  /** @override */
  static _warnedAppV1 = true;

  /* --------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("rule");
    return options;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get template() {
    return this.isEditable
      ? "systems/dnd5e/templates/journal/page-rule-edit.hbs"
      : "templates/journal/page-text-view.html";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = await super.getData(options);
    context.CONFIG = CONFIG.DND5E;
    context.enrichedTooltip = await TextEditor.enrichHTML(this.object.system.tooltip, {
      relativeTo: this.object,
      secrets: this.object.isOwner
    });
    return context;
  }
}
