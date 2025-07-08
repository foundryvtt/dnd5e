import DocumentSheet5e from "../api/document-sheet.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * @typedef JournalEditorConfiguration
 * @property {string} textKeyPath  The path to the specific HTML field being edited.
 */

/**
 * Pop out ProseMirror editor window for journal entries with multiple text areas that need editing.
 * @extends {DocumentSheet5e<ApplicationConfiguration & JournalEditorConfiguration>}
 */
export default class JournalEditor extends DocumentSheet5e {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["journal-editor", "dnd5e2-journal", "titlebar", "dialog-lg"],
    window: {
      resizable: true
    },
    form: {
      submitOnChange: true
    },
    position: {
      width: 550,
      height: 640
    },
    sheetConfig: false,
    textKeyPath: null
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    editor: {
      template: "systems/dnd5e/templates/journal/journal-editor.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return this.options.window.title ?? this.document.name;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const rawText = foundry.utils.getProperty(this.document, this.options.textKeyPath) ?? "";
    return foundry.utils.mergeObject(context, {
      document: this.document,
      enriched: await TextEditor.enrichHTML(rawText, {
        relativeTo: this.document, secrets: this.document.isOwner
      }),
      keyPath: this.options.textKeyPath,
      source: rawText
    });
  }
}
