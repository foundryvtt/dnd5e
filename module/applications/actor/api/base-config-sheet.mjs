import DocumentSheet5e from "../../api/document-sheet.mjs";

/**
 * Base document sheet from which all actor configuration sheets should be based.
 */
export default class BaseConfigSheet extends DocumentSheet5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["config-sheet"],
    sheetConfig: false,
    form: {
      submitOnChange: true
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.advantageModeOptions = [
      { value: -1, label: game.i18n.localize("DND5E.Disadvantage") },
      { value: 0, label: game.i18n.localize("DND5E.Normal") },
      { value: 1, label: game.i18n.localize("DND5E.Advantage") }
    ];
    return context;
  }
}
