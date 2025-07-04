/**
 * Journal entry page that displays a controls for editing rule page tooltip & type.
 */
export default class JournalRulePageSheet extends foundry.applications.sheets.journal.JournalEntryPageProseMirrorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["text", "rule"]
  };

  /* -------------------------------------------- */

  /** @override */
  static EDIT_PARTS = {
    header: super.EDIT_PARTS.header,
    content: super.EDIT_PARTS.content,
    tooltip: {
      template: "systems/dnd5e/templates/journal/page-rule-edit.hbs"
    },
    footer: super.EDIT_PARTS.footer
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.CONFIG = CONFIG.DND5E;
    return context;
  }
}
