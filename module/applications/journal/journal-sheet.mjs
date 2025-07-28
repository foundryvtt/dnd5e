import JournalEntrySheet5e from "./journal-entry-sheet.mjs";

/**
 * Variant of the standard journal sheet to handle custom TOC numbering.
 */
export default class JournalSheet5e extends foundry.appv1.sheets.JournalSheet {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning("The JournalSheet5e application has been deprecated and replaced with "
      + "JournalEntrySheet5e.");
    super(...args);
  }

  /* -------------------------------------------- */

  /** @override */
  static _warnedAppV1 = true;

  /* --------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("dnd5e2-journal", "dnd5e2-journal-legacy");
    return options;
  }

  /* --------------------------------------------- */
  /*  Rendering                                    */
  /* --------------------------------------------- */

  /** @inheritDoc */
  _getPageData() {
    const pageData = super._getPageData();
    JournalEntrySheet5e._adjustTOCNumbering(this.document, Object.fromEntries(pageData.map(p => {
      p.id = p._id;
      return [p.id, p];
    })));
    return pageData;
  }

  /* --------------------------------------------- */

  /** @inheritdoc */
  async _render(...args) {
    await super._render(...args);
    return JournalEntrySheet5e._injectNavigation(this.document, this.element[0]);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.on("pointerdown", event => {
      if ( (event.button === 1) && document.getElementById("tooltip")?.classList.contains("active") ) {
        event.preventDefault();
      }
    });
  }
}
