/**
 * An application for selecting proficiencies with categories that can contain children.
 */
export default class ItemProficiencyConfig extends DocumentSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "item-proficiency-config",
      classes: ["dnd5e", "subconfig"],
      title: "Item Proficiencies",
      template: "systems/dnd5e/templates/apps/item-proficiency-config.hbs",
      width: 320,
      height: "auto",
      levels: [0, 1, 0.5, 2],
      baseProfs: {}
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return this.options.title || super.title;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const data = super.getData();

    const type = this.options.type;
    if ( type !== "tool") {
      this.options.levels = [0, 1];
      this.options.typeProfs = {};
    }
    this.options.baseProfs = {};
    const subtypes = CONFIG.DND5E.itemSubtypes[type];

    for ( const key1 in subtypes ) {
      if ( typeof subtypes[key1] === "object" ) {  // an item subtype, i.e. light armor
        if ( type !== "tool" ) {
          const val = this.object.system.traits.itemProficiencies[type].standard[key1] ?? 0;
          this.options.typeProfs[key1] = this._stackProfData(val, subtypes[key1].label, false);
        }
        for (const key2 in subtypes[key1].baseItems) {
          const val2 = this.object.system.traits.itemProficiencies[type].standard[key2] ?? 0;
          this.options.baseProfs[key2] = this._stackProfData(val2, subtypes[key1].baseItems[key2], false);
        }
      }
      else { // a base item, i.e. leather armor
        const val = this.object.system.traits.itemProficiencies[type].standard[key1] ?? 0;
        this.options.baseProfs[key1] = this._stackProfData(val, subtypes[key1], false);
      }
    }

    for ( let [k, v] of Object.entries(this.object.system.traits.itemProficiencies[type].custom) ) {
      this.options.baseProfs[k] = this._stackProfData(v, k, true);
    }

    // sorting the proficiencies
    this.options.baseProfs = Object.keys(this.options.baseProfs).sort().reduce(
        (obj, key) => {
          obj[key] = this.options.baseProfs[key];
          return obj;
        },
        {}
    );

    if ( this.options.typeProfs ) {
      this.options.typeProfs = Object.keys(this.options.typeProfs).sort().reduce(
          (obj, key) => {
            obj[key] = this.options.typeProfs[key];
            return obj;
          },
          {}
      );
    }

    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
    this.options.itemTypeLabel = `DND5E.${typeCapitalized}TypeLabel`;
    this.options.itemBaseLabel = `DND5E.${typeCapitalized}BaseLabel`;

    return data;
  }

  _stackProfData(val, label, custom) {
    return {
      value: val,
      icon: this._getProficiencyIcon(val),
      label: label,
      custom: custom
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display a certain level of skill proficiency.
   * @param {number} level  A proficiency mode defined in `CONFIG.DND5E.proficiencyLevels`.
   * @returns {string}      HTML string for the chosen icon.
   * @private
   */
  _getProficiencyIcon(level) {
    const icons = {
      0: '<i class="far fa-circle"></i>',
      0.5: '<i class="fas fa-adjust"></i>',
      1: '<i class="fas fa-check"></i>',
      2: '<i class="fas fa-check-double"></i>'
    };
    return icons[level] || icons[0];
  }

  /* -------------------------------------------- */

  /**
   * Handle cycling proficiency in a Skill.
   * @param {Event} event   A click or contextmenu event which triggered the handler.
   * @returns {Promise}     Updated data for this actor after changes are applied.
   * @private
   */
  _onCycleItemProficiency(event) {
    event.preventDefault();

    // Cycle to the next or previous skill level
    const prevSibling = event.currentTarget.previousElementSibling
    let idx = this.options.levels.indexOf(Number(prevSibling.value));
    const next = idx + (event.type === "click" ? 1 : 3);

    const format = ( prevSibling.dataset.custom === "true" ) ? "custom" : "standard";

    const value = Number(this.options.levels[next % this.options.levels.length]);

    // Update the field value and save the form
    if ( value === 0 ) {
      this.object.update({
        [`system.traits.itemProficiencies.${this.options.type}.${format}.-=${prevSibling.dataset.name}`]: null
      });
    }
    else {
      this.object.update({
        [`system.traits.itemProficiencies.${this.options.type}.${format}.${prevSibling.dataset.name}`]:
        value
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle adding a custom item proficiency.
   * @param {Event} event   A click or contextmenu event which triggered the handler.
   * @returns {Promise}     Updated data for this actor after changes are applied.
   * @private
   */
  _onAddCustomItemProficiency(event) {
    event.preventDefault();

    // Cycle to the next or previous skill level
    const prevSibling = event.currentTarget.previousElementSibling
    if ( typeof prevSibling.value === "string" && prevSibling.value !== "" ) {
      this.object.update({
        [`system.traits.itemProficiencies.${this.options.type}.custom.${prevSibling.value}`]: 1
      });
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    if ( this.isEditable ) {
      html.find(".item-proficiency").on("click contextmenu", this._onCycleItemProficiency.bind(this));
      html.find(".item-prof-custom-add").on("click contextmenu", this._onAddCustomItemProficiency.bind(this))
    }
    super.activateListeners(html);
  }

}
