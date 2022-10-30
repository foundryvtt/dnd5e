import TraitSelector from "./trait-selector.mjs";

export default class DamageTraitSelector extends TraitSelector {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/shaper/templates/apps/damage-trait-selector.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const data = foundry.utils.expandObject(formData);
    const updateData = this._prepareUpdateData(data.choices);
    if ( !updateData ) return;
    this.object.update(updateData);
  }

}
