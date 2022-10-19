/**
 * A specialized form used to select from a checklist of attributes, traits, or properties
 */
export default class TraitSelector extends DocumentSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trait-selector",
      classes: ["shaper", "trait-selector", "subconfig"],
      title: "Actor Trait Selection",
      template: "systems/shaper/templates/apps/trait-selector.hbs",
      width: 320,
      height: "auto",
      choices: {},
      allowCustom: true,
      minimum: 0,
      maximum: null,
      labelKey: null,
      valueKey: "value",
      customKey: "custom"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return this.options.title || super.title;
  }

  /* -------------------------------------------- */

  /**
   * Return a reference to the target attribute
   * @type {string}
   */
  get attribute() {
    return this.options.name;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const attr = foundry.utils.getProperty(this.object, this.attribute);
    const o = this.options;
    const value = (o.valueKey) ? foundry.utils.getProperty(attr, o.valueKey) ?? [] : attr;
    const custom = (o.customKey) ? foundry.utils.getProperty(attr, o.customKey) ?? "" : "";

    // Populate choices
    const choices = Object.entries(o.choices).reduce((obj, e) => {
      let [k, v] = e;
      const label = o.labelKey ? foundry.utils.getProperty(v, o.labelKey) ?? v : v;
      obj[k] = { label, chosen: attr ? value.includes(k) : false };
      return obj;
    }, {});

    // Return data
    return {
      allowCustom: o.allowCustom,
      choices: choices,
      custom: custom
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare the update data to include choices in the provided object.
   * @param {object} formData  Form data to search for choices.
   * @returns {object}         Updates to apply to target.
   */
  _prepareUpdateData(formData) {
    const o = this.options;

    // Obtain choices
    const chosen = Object.entries(formData).filter(([k, v]) => (k !== "custom") && v).map(([k]) => k);

    // Object including custom data
    const updateData = {};
    if ( o.valueKey ) updateData[`${this.attribute}.${o.valueKey}`] = chosen;
    else updateData[this.attribute] = chosen;
    if ( o.allowCustom ) updateData[`${this.attribute}.${o.customKey}`] = formData.custom;

    // Validate the number chosen
    if ( o.minimum && (chosen.length < o.minimum) ) {
      return ui.notifications.error(`You must choose at least ${o.minimum} options`);
    }
    if ( o.maximum && (chosen.length > o.maximum) ) {
      return ui.notifications.error(`You may choose no more than ${o.maximum} options`);
    }

    return updateData;
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const updateData = this._prepareUpdateData(formData);
    if ( updateData ) this.object.update(updateData);
  }
}
