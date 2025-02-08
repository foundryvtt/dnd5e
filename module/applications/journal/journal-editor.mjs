import DocumentSheet5e from "../api/document-sheet.mjs";

/**
 * @typedef JournalEditorConfiguration
 * @property {string} textKeyPath  The path to the specific HTML field being edited.
 */

/**
 * Pop out ProseMirror editor window for journal entries with multiple text areas that need editing.
 * @extends {DocumentSheet5e<ApplicationConfiguration & JournalEditorConfiguration>}
 */
export default class JournalEditor extends DocumentSheet5e {
  constructor(options, _options={}) {
    if ( options instanceof JournalEntryPage ) {
      foundry.utils.logCompatibilityWarning(
        "The `JournalEditor` now takes the document within its application options during construction.",
        { since: "DnD5e 4.3", until: "DnD5e 5.0" }
      );
      options = { ..._options, document: options };
    }
    super(options);
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["journal-editor"],
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
