import DocumentSheet5e from "../api/document-sheet.mjs";

/**
 * Application for configuring the source data on actors and items.
 */
export default class SourceConfig extends DocumentSheet5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["source-config", "standard-form"],
    sheetConfig: false,
    position: {
      width: 400
    },
    form: {
      closeOnSubmit: true
    }
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
    return game.i18n.localize("DND5E.SOURCE.Action.Configure");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const source = this.document.system._source;
    context.buttons = [{ icon: "fa-regular fa-save", label: "Save", type: "Save" }];
    context.data = foundry.utils.getProperty(this.document, this.options.keyPath);
    context.fields = this.document.system.schema.getField("source").fields;
    context.keyPath = this.options.keyPath;
    context.source = source.source;
    context.sourceUuid = this.document._stats.compendiumSource;
    context.sourceAnchor = (await fromUuid(context.sourceUuid))?.toAnchor().outerHTML;
    context.rulesVersions = [
      { value: "", label: "" },
      { value: "2024", label: game.i18n.localize("SETTINGS.DND5E.RULESVERSION.Modern") },
      { value: "2014", label: game.i18n.localize("SETTINGS.DND5E.RULESVERSION.Legacy") }
    ];
    if ( this.document.system.hasOwnProperty("identifier") ) context.identifier = {
      field: this.document.system.schema.getField("identifier"),
      placeholder: this.document.identifier,
      value: source.identifier
    };
    return context;
  }
}
