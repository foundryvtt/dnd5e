import { setTheme } from "../settings.mjs";

/**
 * Sheet config with extra options.
 */
export default class SheetConfig5e extends foundry.applications.apps.DocumentSheetConfig {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/shared/sheet-config.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
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
      if ( sheet ) setTheme(sheet, formData["flags.dnd5e.theme"]);
    }
  }
}
