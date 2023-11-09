/**
 * Application for configuring the source data on actors and items.
 */
export default class SourceConfig extends DocumentSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "source-config", "dialog"],
      template: "systems/dnd5e/templates/apps/source-config.hbs",
      width: 400,
      height: "auto",
      dragDrop: [{dropSelector: "form"}],
      submitOnChange: true,
      closeOnSubmit: false,
      sheetConfig: false,
      keyPath: "system.details.source"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return `${game.i18n.localize("DND5E.SourceConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options) {
    const context = super.getData(options);
    context.appId = this.id;
    context.CONFIG = CONFIG.DND5E;
    context.source = foundry.utils.getProperty(this.document, this.options.keyPath);
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="delete"]').click(() => {
      this.form.querySelector('[name="source.uuid"]').value = "";
      this.submit();
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const source = foundry.utils.expandObject(formData).source;
    return this.document.update({[this.options.keyPath]: source});
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const input = this.form.querySelector('[name="source.uuid"]');

    if ( data.uuid ) input.value = data.uuid;
    else {
      const item = await Item.implementation.fromDropData(data);
      if ( !item.uuid ) return;
      input.value = item.uuid;
    }

    return this.submit();
  }
}
