import AdvancementConfig from "./advancement-config.mjs";
import * as Trait from "../../documents/actor/trait.mjs";

/**
 * Configuration application for traits.
 */
export default class TraitConfig extends AdvancementConfig {
  constructor(...args) {
    super(...args);
    this.selected = (this.config.choices.length && !this.config.grants.size) ? 0 : -1;
  }

  /* -------------------------------------------- */

  /**
   * Index of the selected configuration, `-1` means `grants` array, any other number is equal
   * to an index in `choices` array.
   * @type {number}
   */
  selected;

  /* -------------------------------------------- */

  /**
   * Shortcut to the configuration data on the advancement.
   * @type {object}
   */
  get config() {
    return this.advancement.configuration;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "traits", "two-column"],
      template: "systems/dnd5e/templates/advancement/trait-config.hbs",
      width: 540
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const context = super.getData();

    const trait = this.advancement.configuration.type;
    const traitConfig = CONFIG.DND5E.traits[trait];
    if ( traitConfig ) {
      context.default.title = traitConfig.label;
      context.default.icon = traitConfig.icon;
    }

    const listFormatter = new Intl.ListFormat(game.i18n.lang, { type: "conjunction" });
    context.grants = {
      label: listFormatter.format(this.advancement.configuration.grants.map(g => Trait.keyLabel(trait, g))) || "—",
      data: this.advancement.configuration.grants,
      selected: this.selected === -1
    };
    context.choices = this.advancement.configuration.choices.map((choice, index) => ({
      label: Trait.choiceLabel(trait, choice) || "—",
      data: choice,
      selected: this.selected === index
    }));

    const selectedData = (this.selected === -1) ? context.grants.data : context.choices[this.selected].data;
    const chosen = foundry.utils.getType(selectedData) === "Object" ? selectedData.pool : selectedData ?? new Set();
    context.showCount = this.selected !== -1;
    context.count = selectedData?.count;
    context.selectedIndex = this.selected;
    context.choiceOptions = await Trait.choices(trait, chosen);

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    this.form.querySelectorAll("[data-action]").forEach(a => a.addEventListener("click", this._onAction.bind(this)));

    for ( const checkbox of this.form.querySelectorAll(".trait-selector input:checked") ) {
      const children = checkbox.closest("li")?.querySelector("ol");
      if ( !children ) return;

      for ( const child of children.querySelectorAll("input[type='checkbox']") ) {
        child.checked = child.disabled = checkbox.checked;
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle clicks to the Add and Remove buttons above the list.
   * @param {Event} event  Triggering click.
   */
  async _onAction(event) {
    event.preventDefault();
    switch (event.currentTarget.dataset.action) {
      case "add-choice":
        this.advancement.configuration.choices.push({ count: 1 });
        this.selected = this.advancement.configuration.choices.length - 1;
        break;

      case "remove-choice":
        const input = event.currentTarget.closest("li").querySelector("[name='selectedIndex']");
        const selectedIndex = Number(input.value);
        this.advancement.configuration.choices.splice(selectedIndex, 1);
        if ( selectedIndex <= this.selected ) this.selected -= 1;
        break;

      default:
        return;
    }

    // Fix to prevent sets in grants & choice pools being saved as `[object Set]`
    // TOOD: Remove this when https://github.com/foundryvtt/foundryvtt/issues/7706 is resolved
    this.advancement.configuration.grants = Array.from(this.advancement.configuration.grants);
    this.advancement.configuration.choices.forEach(c => {
      if ( !c.pool ) return;
      c.pool = Array.from(c.pool);
    });

    await this.advancement.update({configuration: this.advancement.configuration});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    const t = event.target;

    if ( t.name === "configuration.type" ) this.selected = -1;
    else if ( t.name === "selectedIndex" ) {
      this.selected = Number(t.value ?? -1);
      return this.render();
    }

    super._onChangeInput(event);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const updates = foundry.utils.expandObject(formData);
    const pool = Object.entries(updates.choices).reduce((arr, [key, selected]) => {
      if ( selected ) arr.push(key);
      return arr;
    }, []);
    updates.configuration ??= {};

    if ( updates.configuration.type && (this.advancement.configuration.type !== updates.configuration.type) ) {
      updates.configuration.grants = [];
      updates.configuration.choices = [];
    } else if ( this.selected !== -1 ) {
      const choicesCollection = foundry.utils.deepClone(this.advancement.configuration.choices);
      const current = choicesCollection[this.selected];
      if ( "count" in updates ) current.count = updates.count;
      if ( "choices" in updates ) current.pool = pool;

      // TODO: Remove when https://github.com/foundryvtt/foundryvtt/issues/7706 is resolved
      choicesCollection.forEach(c => {
        if ( !c.pool ) return;
        c.pool = Array.from(c.pool);
      });

      updates.configuration.choices = choicesCollection;
    } else if ( "choices" in updates ) {
      updates.configuration.grants = pool;
    }

    delete updates.choices;
    return super._updateObject(event, foundry.utils.flattenObject(updates));
  }
}
