/**
 * Config sheet for the Rotate Area region behavior.
 */
export default class RotateAreaConfig extends foundry.applications.sheets.RegionBehaviorConfig {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    actions: {
      addPosition: RotateAreaConfig.#addPosition,
      deletePosition: RotateAreaConfig.#deletePosition,
      rotateToPosition: RotateAreaConfig.#rotateToPosition
    },
    classes: ["rotate-area"]
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    form: {
      template: "systems/dnd5e/templates/region-behaviors/rotate-area-config.hbs",
      scrollable: [""]
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.fields.forEach(fs => fs.fields.forEach(f => f.localize = true));
    context.positions = context.source.system.positions.map((data, index) => ({
      data,
      fields: this.document.system.schema.fields.positions.element.fields,
      label: `#${index}`
    }));
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getFields() {
    const fieldsets = super._getFields();
    for ( const fieldset of fieldsets ) {
      fieldset.fields = fieldset.fields.filter(f => !f.field.options.hidden);
    }
    return fieldsets;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle adding a new position.
   * @this {RotateAreaConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #addPosition(event, target) {
    await this.submit();
    const positions = this.document.system.toObject().positions;
    let angle = 0;
    if ( positions.length > 1 ) {
      angle = positions.at(-1).angle + positions.at(-1).angle - positions.at(-2).angle;
    } else if ( positions.length === 1 ) angle = positions[0].angle + 90;
    this.document.update({ "system.positions": [...positions, { angle }] });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing a position.
   * @this {RotateAreaConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #deletePosition(event, target) {
    await this.submit();
    const position = Number(target.closest("[data-index]")?.dataset.index);
    this.document.update({ "system.positions": this.document.system.toObject().positions.toSpliced(position, 1) });
  }

  /* -------------------------------------------- */

  /**
   * Handle rotating to a specific position.
   * @this {RotateAreaConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #rotateToPosition(event, target) {
    await this.submit();
    const position = Number(target.closest("[data-index]")?.dataset.index);
    this.document.system.rotateTo({ position });
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareSubmitData(event, form, formData, updateData) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    if ( submitData.system?.regions?.ids?.includes(this.document.parent.id) ) {
      throw new Error(game.i18n.localize("DND5E.REGIONBEHAVIORS.ROTATEAREA.Warning.RecursiveRegion"));
    }
    return submitData;
  }
}
