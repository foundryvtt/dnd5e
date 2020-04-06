/**
 * A specialized form used to select damage or condition types which apply to an Actor
 * @type {FormApplication}
 */
export class ActorTraitSelector extends FormApplication {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
	    id: "trait-selector",
      classes: ["dnd5e"],
      title: "Actor Trait Selection",
      template: "systems/dnd5e/templates/apps/trait-selector.html",
      width: 320,
      height: "auto",
      choices: {}
    });
  }

  /* -------------------------------------------- */

  /**
   * Return a reference to the target attribute
   * @type {String}
   */
  get attribute() {
	  return this.options.name;
  }

  /* -------------------------------------------- */

  /**
   * Provide data to the HTML template for rendering
   * @type {Object}
   */
  getData() {

    // Get current values
    let attr = getProperty(this.object.data, this.attribute);

	  // Populate choices
    const choices = duplicate(this.options.choices);
    for ( let [k, v] of Object.entries(choices) ) {
      choices[k] = {
        label: v,
        chosen: attr ? attr.value.includes(k) : false
      }
    }

    // Return data
	  return {
	    choices: choices,
      custom: attr ? attr.custom : ""
    }
  }

  /* -------------------------------------------- */

  /**
   * Update the Actor object with new trait data processed from the form
   * @private
   */
  _updateObject(event, formData) {
    const choices = [];
    for ( let [k, v] of Object.entries(formData) ) {
      if ( (k !== "custom") && v ) choices.push(k);
    }
    this.object.update({
      [`${this.attribute}.value`]: choices,
      [`${this.attribute}.custom`]: formData.custom
    });
  }
}
