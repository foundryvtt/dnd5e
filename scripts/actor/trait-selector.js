/**
 * A specialized form used to select damage or condition types which apply to an Actor
 * @type {FormApplication}
 */
class TraitSelector5e extends FormApplication {
	static get defaultOptions() {
	  const options = super.defaultOptions;
	  options.id = "trait-selector";
	  options.classes = ["dnd5e"];
	  options.title = "Actor Trait Selection";
	  options.template = "public/systems/dnd5e/templates/actors/trait-selector.html";
	  options.width = 200;
	  return options;
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
    let current = getProperty(this.object.data, this.attribute);
	  if ( typeof current === "string" ) current = this.constructor._backCompat(current, this.options.choices);

	  // Populate choices
    const choices = duplicate(this.options.choices);
    for ( let [k, v] of Object.entries(choices) ) {
      choices[k] = {
        label: v,
        chosen: current.includes(k)
      }
    }

    // Return data
	  const data = {
	    choices: choices
    };
	  return data;
  }

  /* -------------------------------------------- */

  /**
   * Support backwards compatibility for old-style string separated traits
   * @private
   */
  static _backCompat(current, choices) {
    if ( !current || current.length === 0 ) return [];
	  current = current.split(/[\s,]/).filter(t => !!t);
    return current.map(val => {
      for ( let [k, v] of Object.entries(choices) ) {
        if ( val === v ) return k;
        }
      return null;
    }).filter(val => !!val);
  }

  /* -------------------------------------------- */

  /**
   * Update the Actor object with new trait data processed from the form
   * @private
   */
  _updateObject(event, formData) {
    const choices = [];
    for ( let [k, v] of Object.entries(formData) ) {
      if ( v ) choices.push(k);
    }
    this.object.update({[this.attribute]: choices});
  }
}
