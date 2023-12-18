/**
 * Sheet config with extra options.
 */
export default class SheetConfig5e extends DocumentSheetConfig {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/shared/sheet-config.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options) {
    const context = super.getData(options);
    context.CONFIG = CONFIG.DND5E;
    return context;
  }

  /* -------------------------------------------- */

  async _updateObject(event, formData) {
    super._updateObject(event, formData);
    delete formData.sheetClass;
    delete formData.defaultClass;
    this.object.update(formData);

    if ( "flags.dnd5e.theme" in formData ) {
      const sheet = this.object.sheet.element?.[0];
      if ( sheet ) sheet.dataset.theme = formData["flags.dnd5e.theme"];
    }
  }
}
