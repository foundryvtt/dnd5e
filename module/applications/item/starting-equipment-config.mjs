/**
 * Configuration application for Starting Equipment.
 */
export default class StartingEquipmentConfig extends DocumentSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "starting-equipment"],
      dragDrop: [{ dropSelector: "form" }],
      template: "systems/dnd5e/templates/apps/starting-equipment-config.hbs",
      width: 400,
      height: "auto",
      sheetConfig: false,
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true
    });
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = await super.getData(options);
    context.startingEquipment = this.document.system.startingEquipment;
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Handling                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    console.log(event, formData);
  }
}
