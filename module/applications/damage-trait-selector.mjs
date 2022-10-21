import TraitSelector from "./trait-selector.mjs";

/**
 * @deprecated since dnd5e 2.1, targeted for removal in 2.3
 */
export default class DamageTraitSelector extends TraitSelector {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/apps/damage-trait-selector.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    const attr = foundry.utils.getProperty(this.object, this.attribute);

    data.bypasses = Object.entries(this.options.bypasses).reduce((obj, [k, v]) => {
      obj[k] = { label: v, chosen: attr ? attr.bypasses.includes(k) : false };
      return obj;
    }, {});

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const data = foundry.utils.expandObject(formData);
    const updateData = this._prepareUpdateData(data.choices);
    if ( !updateData ) return;
    updateData[`${this.attribute}.bypasses`] = Object.entries(data.bypasses).filter(([, v]) => v).map(([k]) => k);
    this.object.update(updateData);
  }

}
