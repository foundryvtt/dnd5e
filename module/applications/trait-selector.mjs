/**
 * A specialized form used to select from a checklist of attributes, traits, or properties.
 * @deprecated since dnd5e 2.1, targeted for removal in 2.3
 */
export default class TraitSelector extends DocumentSheet {
  constructor(...args) {
    super(...args);

    if ( !this.options.suppressWarning ) foundry.utils.logCompatibilityWarning(
      `${this.constructor.name} has been deprecated in favor of a more specialized TraitSelector `
      + "available at 'dnd5e.applications.actor.TraitSelector'. Support for the old application will "
      + "be removed in a future version.",
      { since: "DnD5e 2.1", until: "DnD5e 2.3" }
    );
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trait-selector",
      classes: ["dnd5e", "trait-selector", "subconfig"],
      title: "Actor Trait Selection",
      template: "systems/dnd5e/templates/apps/trait-selector.hbs",
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
      choices: choices,
      custom: custom,
      customPath: o.allowCustom ? "custom" : null
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
    formData = foundry.utils.expandObject(formData);

    // Obtain choices
    const chosen = Object.entries(formData.choices).filter(([, v]) => v).map(([k]) => k);

    // Object including custom data
    const updateData = {};
    if ( o.valueKey ) updateData[`${this.attribute}.${o.valueKey}`] = chosen;
    else updateData[this.attribute] = chosen;
    if ( o.allowCustom ) updateData[`${this.attribute}.${o.customKey}`] = formData.custom;

    // Validate the number chosen
    if ( o.minimum && (chosen.length < o.minimum) ) {
      ui.notifications.error(`You must choose at least ${o.minimum} options`);
      return null;
    }
    if ( o.maximum && (chosen.length > o.maximum) ) {
      ui.notifications.error(`You may choose no more than ${o.maximum} options`);
      return null;
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
