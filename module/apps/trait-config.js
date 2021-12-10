/**
 * Configuration for a specific trait choice.
 *
 * @typedef {object} TraitChoice
 * @property {number} count        How many traits can be selected.
 * @property {string[]} [choices]  List of trait or category keys that can be chosen. If no choices
 *                                 are provided, any trait of the specified type can be selected.
 */


/**
 * A form used to configure player choices for skill, tool, language, and other proficiencies
 * on Background and Class items.
 * @extends {DocumentSheet}
 */
export default class TraitConfig extends DocumentSheet {

  constructor(object={}, options={}) {
    super(object, options);

    /**
     * Path to the `grants` array within the traits data.
     * @type {string}
     */
    this.grantsKeyPath = options.grantsKeyPath ?? "grants";

    /**
     * Path to the `choices` array within the traits data.
     * @type {string}
     */
    this.choicesKeyPath = options.choicesKeyPath ?? "choices";

    /**
     * Internal version of the grants array.
     * @type {string[]}
     */
    this.grants = foundry.utils.getProperty(this.object.data, `${options.name}.${this.grantsKeyPath}`);

    /**
     * Internal version of the choices array.
     * @type {TraitChoice[]}
     */
    this.choices = foundry.utils.getProperty(this.object.data, `${options.name}.${this.choicesKeyPath}`);

    /**
     * Index of the selected configuration, `0` means grants configuration, any other number
     * is equal to an index in `choices` + 1.
     * @type {number}
     */
    this.selectedIndex = 0;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trait-configuration",
      classes: ["dnd5e", "trait-configuration", "subconfig"],
      title: "Trait Configuration",
      template: "systems/dnd5e/templates/apps/trait-configuration.html",
      width: 540,
      height: "auto",
      type: ""
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("DND5E.TraitConfigTitle", {
      type: this.constructor.typeLabel(this.options.type, 1)
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const listFormatter = new Intl.ListFormat(game.i18n.lang, { type: "conjunction" });
    const configurations = [{
      label: listFormatter.format(this.grants.map(g => this.constructor.keyLabel(this.options.type, g))) || "—",
      data: this.grants,
      selected: this.selectedIndex === 0
    }, ...this.choices.map((choice, index) => {
      return {
        label: this.constructor.choiceLabel(this.options.type, choice) || "—",
        data: choice,
        selected: this.selectedIndex === (index + 1)
      };
    })];

    const selectedData = configurations[this.selectedIndex]?.data;
    const chosen = Array.isArray(selectedData) ? selectedData : selectedData.choices ?? [];
    const choices = await this.constructor.getTraitChoices(this.options.type, chosen);

    return { configurations, showCount: this.selectedIndex !== 0, count: selectedData?.count, choices };
  }

  /* -------------------------------------------- */

  /**
   * Produce an object containing all of the choices for the provided trait type.
   * @param {string} type      Trait name.
   * @param {string[]} chosen  Any currently selected options.
   * @returns {SelectChoices}  Object of choices ready to be displayed in a TraitSelector list.
   */
  static async getTraitChoices(type, chosen) {
    const traitConfig = CONFIG.DND5E.traits[type];

    if ( traitConfig.proficiency ) {
      return game.dnd5e.applications.ProficiencySelector.getChoices(type, chosen);
    }

    return Object.entries(CONFIG.DND5E[traitConfig.configKey ?? type] ?? {}).reduce((obj, [key, label]) => {
      obj[key] = {
        label,
        chosen: chosen?.includes(key) ?? false
      };
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Create a human readable description of the provided choice.
   * @param {string} type       Trait name.
   * @param {TraitChoice} data  Data for a specific grant.
   * @returns {string}          Formatted and localized name.
   */
  static choiceLabel(type, data) {
    // Select from all options
    if ( !data.choices ) {
      return game.i18n.format("DND5E.TraitConfigChooseAny", {
        count: data.count,
        type: this.typeLabel(type, data.count).toLowerCase()
      });
    }

    const choices = data.choices.map(key => this.keyLabel(type, key));
    const listFormatter = new Intl.ListFormat(game.i18n.lang, { type: "disjunction" });
    return game.i18n.format("DND5E.TraitConfigChooseList", {
      count: data.count,
      list: listFormatter.format(choices)
    });
  }

  /* -------------------------------------------- */

  /**
   * Get the localized label for a specific trait type.
   * @param {string} type     Trait type.
   * @param {number} [count]  Count used to determine pluralization. If no count is provided, will default
   *                          to the 'other' pluralization.
   * @returns {string}        Localized label.
   */
  static typeLabel(type, count) {
    const traitConfig = CONFIG.DND5E.traits[type];
    let typeCap = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    if ( traitConfig.proficiency ) typeCap = `${typeCap}Prof`;

    const pluralRule = ( count !== undefined ) ? new Intl.PluralRules(game.i18n.lang).select(count) : "other";

    return game.i18n.localize(`DND5E.Trait${typeCap}Plural.${pluralRule}`);
  }

  /* -------------------------------------------- */

  /**
   * Get the localized label for a specific key.
   * @param {string} type  Trait type (e.g. `"weapon"` or `"tool"`).
   * @param {string} key   Trait key (e.g. `"martial"` or `"disg"`).
   * @returns {string}     Localized name.
   */
  static keyLabel(type, key) {
    const traitConfig = CONFIG.DND5E.traits[type];

    if ( traitConfig.proficiency ) {
      const categories = CONFIG.DND5E[`${type}Proficiencies`];
      if ( categories[key] ) return categories[key];

      if ( type === "tool" && CONFIG.DND5E.vehicleTypes[key] ) {
        return CONFIG.DND5E.vehicleTypes[key];
      }

      const item = game.dnd5e.applications.ProficiencySelector.getBaseItem(
        CONFIG.DND5E[`${type}Ids`][key], { indexOnly: true });
      return item?.name ?? "";
    } else {
      const source = CONFIG.DND5E[traitConfig.configKey ?? type];
      return source[key] ?? "";
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const updateData = {};
    updateData[`${this.options.name}.${this.grantsKeyPath}`] = this.grants;
    updateData[`${this.options.name}.${this.choicesKeyPath}`] = this.choices.filter(grant => grant !== "");
    return this.object.update(updateData);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    this.form.addEventListener("click", this._onListButtonClick.bind(this));

    if ( this.selectedIndex === 0 ) {
      this.form.querySelector("button[name='remove']").setAttribute("disabled", true);
    }

    for ( const checkbox of html[0].querySelectorAll(".trait-selector input[type='checkbox']") ) {
      if ( checkbox.checked ) game.dnd5e.applications.ProficiencySelector._onToggleCategory(checkbox);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle clicks to the Add and Remove buttons above the list.
   * @param {Event} event  Triggering click.
   */
  _onListButtonClick(event) {
    if ( event.target.tagName !== "BUTTON" ) return;

    switch (event.target.name) {
      case "add":
        this.choices.push({ count: 1 });
        this.selectedIndex = this.choices.length;
        break;

      case "remove":
        if ( this.selectedIndex === 0 ) break;

        this.choices.splice(this.selectedIndex - 1, 1);

        if ( this.choices.length === 0 ) this.selectedIndex = 0;
        else if ( this.selectedIndex !== 0 ) this.selectedIndex -= 1;
        break;

      default:
        return;
    }

    event.preventDefault();
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    super._onChangeInput(event);
    const t = event.target;

    if ( t.name === "selectedIndex" ) {
      this.selectedIndex = Number(t.value ?? 0);
      return this.render();
    }

    if ( this.selectedIndex === 0 ) {
      if ( !t.closest(".trait-selector") ) return;
      const index = this.grants.indexOf(t.name);
      if ( !t.checked && (index >= 0) ) {
        this.grants.splice(index, 1);
      } else if ( index === -1 ) {
        this.grants.push(t.name);
      }
      return this.render();
    }

    const idx = this.selectedIndex - 1;
    const current = this.choices[idx];
    if ( current === undefined ) return;

    if ( t.name === "count" ) {
      let count = Number.parseInt(t.value);
      if ( (count < 1) || Number.isNaN(count) ) count = 1;
      this.choices[idx].count = count;
    }

    else if ( t.closest(".trait-selector") ) {
      let choiceSet = new Set(current.choices ?? []);
      if ( t.checked ) choiceSet.add(t.name);
      else choiceSet.delete(t.name);
      if ( choiceSet.size > 0 ) {
        this.choices[idx].choices = Array.from(choiceSet);
      } else if ( current.choices ) {
        delete this.choices[idx].choices;
      }
    }

    return this.render();
  }
}
