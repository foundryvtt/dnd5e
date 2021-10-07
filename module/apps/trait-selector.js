/**
 * A specialized form used to select from a checklist of attributes, traits, or properties
 * @extends {DocumentSheet}
 */
export default class TraitSelector extends DocumentSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trait-selector",
      classes: ["dnd5e", "trait-selector", "subconfig"],
      title: "Actor Trait Selection",
      template: "systems/dnd5e/templates/apps/trait-selector.html",
      width: 320,
      height: "auto",
      choices: {},
      allowCustom: true,
      minimum: 0,
      maximum: null,
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
    const attr = foundry.utils.getProperty(this.object.data, this.attribute);
    const o = this.options;
    const value = (o.valueKey) ? foundry.utils.getProperty(attr, o.valueKey) ?? [] : attr;
    const custom = (o.customKey) ? foundry.utils.getProperty(attr, o.customKey) ?? "" : "";

    // Populate choices
    const choices = Object.entries(o.choices).reduce((obj, e) => {
      let [k, v] = e;
      obj[k] = { label: v, chosen: attr ? value.includes(k) : false };
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

  /** @override */
  async _updateObject(event, formData) {
    const o = this.options;

    // Obtain choices
    const chosen = [];
    for ( let [k, v] of Object.entries(formData) ) {
      if ( (k !== "custom") && v ) chosen.push(k);
    }

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

    // Update the object
    this.object.update(updateData);
  }
}
