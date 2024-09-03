import DocumentSheet5e from "./api/document-sheet.mjs";

/**
 * Application for configuring the source data on actors and items.
 */
export default class SourceConfig extends DocumentSheet5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["source-config"],
    sheetConfig: false,
    position: {
      width: 400
    },
    form: {
      closeOnSubmit: true
    },
    keyPath: "system.details.source"
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    source: {
      template: "systems/dnd5e/templates/apps/source-config.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.SourceConfig");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.buttons = [{ icon: "fa-regular fa-save", label: "Submit", type: "submit" }];
    context.data = foundry.utils.getProperty(this.document, this.options.keyPath);
    context.fields = this.document.system.schema.getField(this.options.keyPath.replace(/^system\./, "")).fields;
    context.keyPath = this.options.keyPath;
    context.source = foundry.utils.getProperty(this.document.toObject(), this.options.keyPath);
    context.sourceUuid = this.document._stats.compendiumSource;
    context.hasSourceId = !!(await fromUuid(context.sourceUuid));
    return context;
  }
}
