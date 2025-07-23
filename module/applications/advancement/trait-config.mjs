import AdvancementConfig from "./advancement-config-v2.mjs";
import * as Trait from "../../documents/actor/trait.mjs";
import { filteredKeys } from "../../utils.mjs";

const { BooleanField, StringField } = foundry.data.fields;

/**
 * Configuration application for traits.
 */
export default class TraitConfig extends AdvancementConfig {
  constructor(...args) {
    super(...args);
    this.selected = (this.config.choices.length && !this.config.grants.size) ? 0 : -1;
    this.trait = this.types.first() ?? "skills";
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["trait", "trait-selector"],
    actions: {
      addChoice: TraitConfig.#addChoice,
      removeChoice: TraitConfig.#removeChoice
    },
    position: {
      width: 680
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    config: {
      container: { classes: ["column-container"], id: "column-left" },
      template: "systems/dnd5e/templates/advancement/advancement-controls-section.hbs"
    },
    details: {
      container: { classes: ["column-container"], id: "column-left" },
      template: "systems/dnd5e/templates/advancement/trait-config-details.hbs"
    },
    guaranteed: {
      container: { classes: ["column-container"], id: "column-left" },
      template: "systems/dnd5e/templates/advancement/trait-config-guaranteed.hbs"
    },
    choices: {
      container: { classes: ["column-container"], id: "column-left" },
      template: "systems/dnd5e/templates/advancement/trait-config-choices.hbs"
    },
    traits: {
      container: { classes: ["column-container"], id: "column-right" },
      template: "systems/dnd5e/templates/advancement/trait-config-traits.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Shortcut to the configuration data on the advancement.
   * @type {object}
   */
  get config() {
    return this.advancement.configuration;
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
   * Trait type to display in the selector interface.
   * @type {string}
   */
  trait;

  /* -------------------------------------------- */

  /**
   * List of trait types for the current selected configuration.
   * @type {Set<string>}
   */
  get types() {
    const pool = this.selected === -1 ? this.config.grants : this.config.choices[this.selected].pool;
    return this.advancement.representedTraits([pool]);
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.grants = {
      label: Trait.localizedList({ grants: this.config.grants }) || "—",
      data: this.config.grants,
      selected: this.selected === -1
    };
    context.choices = this.config.choices.map((choice, index) => ({
      label: Trait.choiceLabel(choice, { only: true }).capitalize() || "—",
      data: choice,
      selected: this.selected === index
    }));
    const chosen = (this.selected === -1) ? context.grants.data : context.choices[this.selected].data.pool;
    if ( this.selected !== -1 ) context.count = {
      field: context.configuration.fields.choices.element.fields.count,
      value: context.choices[this.selected]?.data.count
    };
    context.selectedIndex = this.selected;

    const rep = this.advancement.representedTraits();
    context.disableAllowReplacements = rep.size > 1;
    const traitConfig = rep.size === 1 ? CONFIG.DND5E.traits[rep.first()] : null;
    if ( traitConfig ) {
      context.default.title = traitConfig.labels.title;
      context.default.icon = traitConfig.icon;
    } else {
      context.default.title = game.i18n.localize("DND5E.TraitGenericPlural.other");
      context.default.icon = this.advancement.constructor.metadata.icon;
    }
    context.default.hint = Trait.localizedList({ grants: this.config.grants, choices: this.config.choices });

    context.trait = {
      field: new BooleanField(),
      input: context.inputs.createCheckboxInput,
      options: await Trait.choices(this.trait, { chosen, prefixed: true, any: this.selected !== -1 }),
      selected: this.trait,
      selectedHeader: `${CONFIG.DND5E.traits[this.trait].labels.localization}.other`,
      typeField: new StringField({
        required: true, blank: false, label: game.i18n.localize("DND5E.ADVANCEMENT.Trait.TraitType")
      }),
      typeOptions: Object.entries(CONFIG.DND5E.traits)
        .filter(([, config]) => ((this.config.mode === "default") || (this.config.mode === "mastery"
          ? config.mastery : config.expertise)) && (config.dataType !== Number))
        .map(([value, config]) => ({ value, label: config.labels.title }))
    };

    // Disable selecting categories in mastery mode
    if ( this.advancement.configuration.mode === "mastery" ) {
      context.trait.options.forEach((key, value) => value.disabled = !!value.children);
    }

    context.mode = {
      hint: CONFIG.DND5E.traitModes[this.advancement.configuration.mode].hint,
      options: Object.entries(CONFIG.DND5E.traitModes).map(([value, { label }]) => ({ value, label }))
    };

    return context;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    // Handle selecting & disabling category children when a category is selected
    for ( const checkbox of this.element.querySelectorAll(".trait-list dnd5e-checkbox[checked]") ) {
      const toCheck = (checkbox.name.endsWith("*") || checkbox.name.endsWith("ALL"))
        ? checkbox.closest("ol").querySelectorAll(`dnd5e-checkbox:not([name="${checkbox.name}"])`)
        : checkbox.closest("li").querySelector("ol")?.querySelectorAll("dnd5e-checkbox");
      toCheck?.forEach(i => i.checked = i.disabled = true);
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle adding a new choice.
   * @this {TraitConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #addChoice(event, target) {
    this.config.choices.push({ count: 1 });
    this.selected = this.config.choices.length - 1;
    await this.advancement.update({ configuration: await this.prepareConfigurationUpdate() });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing a choice.
   * @this {TraitConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #removeChoice(event, target) {
    const input = target.closest("li").querySelector("[name='selectedIndex']");
    const selectedIndex = Number(input.value);
    this.config.choices.splice(selectedIndex, 1);
    if ( selectedIndex <= this.selected ) this.selected -= 1;
    await this.advancement.update({ configuration: await this.prepareConfigurationUpdate() });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    // Display new set of trait choices
    if ( event.target.name === "selectedTrait" ) {
      this.trait = event.target.value;
      return this.render();
    }

    // Change selected configuration set
    else if ( event.target.name === "selectedIndex" ) {
      this.selected = Number(event.target.value ?? -1);
      const types = this.types;
      if ( types.size && !types.has(this.trait) ) this.trait = types.first();
      return this.render();
    }

    // If mode is changed from default to one of the others, change selected type if current type is not valid
    if ( (event.target.name === "configuration.mode")
      && (event.target.value !== "default")
      && (event.target.value !== this.config.mode) ) {
      const checkKey = event.target.value === "mastery" ? "mastery" : "expertise";
      const validTraitTypes = filteredKeys(CONFIG.DND5E.traits, c => c[checkKey]);
      if ( !validTraitTypes.includes(this.trait) ) this.trait = validTraitTypes[0];
    }

    super._onChangeForm(formConfig, event);
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async prepareConfigurationUpdate(configuration={}) {
    const choicesCollection = foundry.utils.deepClone(this.config.choices);

    if ( configuration.checked ) {
      const prefix = `${this.trait}:`;
      const filteredSelected = filteredKeys(configuration.checked);

      // Update grants
      if ( this.selected === -1 ) {
        const filteredPrevious = this.config.grants.filter(k => !k.startsWith(prefix));
        configuration.grants = [...filteredPrevious, ...filteredSelected];
      }

      // Update current choice pool
      else {
        const current = choicesCollection[this.selected];
        const filteredPrevious = current.pool.filter(k => !k.startsWith(prefix));
        current.pool = [...filteredPrevious, ...filteredSelected];
      }
      delete configuration.checked;
    }

    if ( configuration.count ) {
      choicesCollection[this.selected].count = configuration.count;
      delete configuration.count;
    }

    configuration.choices = choicesCollection;
    configuration.grants ??= Array.from(this.config.grants);

    // If one of the expertise modes is selected, filter out any traits that are not of a valid type
    if ( (configuration.mode ?? this.config.mode) !== "default" ) {
      const checkKey = (configuration.mode ?? this.config.mode) === "mastery" ? "mastery" : "expertise";
      const validTraitTypes = filteredKeys(CONFIG.DND5E.traits, c => c[checkKey]);
      configuration.grants = configuration.grants.filter(k => validTraitTypes.some(t => k.startsWith(t)));
      configuration.choices.forEach(c => c.pool = c.pool?.filter(k => validTraitTypes.some(t => k.startsWith(t))));
    }

    return configuration;
  }
}
