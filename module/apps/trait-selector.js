/**
 * A specialized form used to select from a checklist of attributes, traits, or properties
 * @extends {FormApplication}
 */
export default class TraitSelector extends FormApplication {

  /** @inheritdoc */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "trait-selector", "subconfig"],
      title: "Actor Trait Selection",
      template: "systems/dnd5e/templates/apps/trait-selector.html",
      width: 320,
      height: "auto",
      choices: {},
      allowCustom: true,
      minimum: 0,
      maximum: null
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get id() {
    return `trait-selector-${this.object.id}`;
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

    // Get the source object value
    let attr = foundry.utils.getProperty(this.object.toJSON(), this.attribute);
    if ( foundry.utils.getType(attr) !== "Object" ) attr = {value: [], custom: ""};

	  // Populate choices
    const choices = Object.entries(this.options.choices).reduce((obj, e) => {
      let [k, v] = e;
      obj[k] = {
        label: v,
        chosen: attr ? attr.value.includes(k) : false
      };
      return obj;
    }, {})

    // Return data
    return {
      allowCustom: this.options.allowCustom,
	    choices: choices,
      custom: attr ? attr.custom : ""
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const updateData = {};

    // Obtain choices
    const chosen = [];
    for ( let [k, v] of Object.entries(formData) ) {
      if ( (k !== "custom") && v ) chosen.push(k);
    }
    updateData[`${this.attribute}.value`] = chosen;

    // Validate the number chosen
    if ( this.options.minimum && (chosen.length < this.options.minimum) ) {
      return ui.notifications.error(`You must choose at least ${this.options.minimum} options`);
    }
    if ( this.options.maximum && (chosen.length > this.options.maximum) ) {
      return ui.notifications.error(`You may choose no more than ${this.options.maximum} options`);
    }

    // Include custom
    if ( this.options.allowCustom ) {
      updateData[`${this.attribute}.custom`] = formData.custom;
    }

    // Update the object
    this.object.update(updateData);
  }
}
