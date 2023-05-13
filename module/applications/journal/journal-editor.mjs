/**
 * Pop out ProseMirror editor window for journal entries with multiple text areas that need editing.
 *
 * @param {JournalEntryPage} document   Journal entry page to be edited.
 * @param {object} options
 * @param {string} options.textKeyPath  The path to the specific HTML field being edited.
 */
export default class JournalEditor extends DocumentSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["journal-editor"],
      template: "systems/dnd5e/templates/journal/journal-editor.hbs",
      width: 520,
      height: 640,
      textKeyPath: null,
      resizable: true
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    if ( this.options.title ) return `${this.document.name}: ${this.options.title}`;
    else return this.document.name;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const data = super.getData();
    const rawText = foundry.utils.getProperty(this.document, this.options.textKeyPath) ?? "";
    return foundry.utils.mergeObject(data, {
      enriched: await TextEditor.enrichHTML(rawText, {
        relativeTo: this.document, secrets: this.document.isOwner, async: true
      })
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _updateObject(event, formData) {
    this.document.update(formData);
  }

}
