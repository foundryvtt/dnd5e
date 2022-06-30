import TraitSelector from "./trait-selector.js";


export default class DamageTraitSelector extends TraitSelector {
  
  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "damage-trait-selector",
      template: "systems/dnd5e/templates/apps/damage-trait-selector.html"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    const attr = foundry.utils.getProperty(this.object.data, this.attribute);

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

    const bypassesChosen = Object.entries(data.bypasses).filter(([k, v]) => v).map(([k, ]) => k);
    updateData[`${this.attribute}.bypasses`] = bypassesChosen;

    this.object.update(updateData);
  }

}
