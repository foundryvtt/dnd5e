import SelectChoices from "../../../documents/actor/select-choices.mjs";
import * as Trait from "../../../documents/actor/trait.mjs";
import { filteredKeys } from "../../../utils.mjs";
import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Base application for selecting an actor's proficiencies.
 */
export default class TraitsConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["trait-selector"],
    trait: null,
    position: {
      width: 600
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    traits: {
      template: "systems/dnd5e/templates/actors/config/traits-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return Trait.traitLabel(this.options.trait);
  }

  /* -------------------------------------------- */

  /**
   * Label used for the "other" category.
   * @type {string}
   */
  get otherLabel() {
    return game.i18n.localize("DND5E.ProficiencyOther");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    if ( !CONFIG.DND5E.traits[options.trait] ) throw new Error(
      `Cannot instantiate TraitsConfig with a trait not defined in CONFIG.DND5E.traits: ${options.trait}.`
    );
    options.uniqueId = `${options.trait}-${options.document.uuid}`.replace(/\./g, "-");
    return options;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.keyPath = Trait.actorKeyPath(this.options.trait);
    context.data = foundry.utils.getProperty(this.document._source, context.keyPath);
    context.checkbox = new foundry.data.fields.BooleanField();
    const chosen = new Set(
      filteredKeys(await Trait.actorValues(this.document, this.options.trait)).map(k => k.split(":").pop())
    );
    context.choices = await Trait.choices(this.options.trait, { chosen });
    context.fields = Trait.actorFields(this.document, this.options.trait);

    // Handle custom traits not in a top-level category
    const other = {
      label: this.otherLabel,
      children: new SelectChoices(),
      otherGroup: true
    };
    for ( const [key, choice] of Object.entries(context.choices) ) {
      if ( choice.children ) continue;
      other.children[key] = choice;
      delete context.choices[key];
    }
    if ( !other.children.isEmpty ) context.choices.OTHER = other;
    this._processChoices(context.data, context.choices);

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Processes the choices to ensure that children are checked if the category is checked and that
   * masteries are only enabled if character has proficiency.
   * @param {object} data                     Traits data.
   * @param {SelectChoices} choices           Choices object.
   * @param {boolean} [categoryChosen=false]  Is the category above this one selected?
   * @protected
   */
  _processChoices(data, choices, categoryChosen=false) {
    for ( const [key, choice] of Object.entries(choices) ) {
      this._processChoice(data, key, choice, categoryChosen);
      if ( choice.children ) this._processChoices(data, choice.children, choice.chosen && (key !== "OTHER"));
    }
  }

  /* -------------------------------------------- */

  /**
   * Perform any modification on a choice.
   * @param {object} data                     Traits data.
   * @param {string} key                      Choice key.
   * @param {object} choice                   Data for the choice.
   * @param {boolean} [categoryChosen=false]  Is the category above this one selected?
   * @protected
   */
  _processChoice(data, key, choice, categoryChosen=false) {
    if ( (data.value?.includes?.("ALL") && (key !== "ALL")) || categoryChosen ) {
      choice.chosen = true;
      choice.disabled = true;
    }
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);
    if ( !CONFIG.DND5E.traits[this.options.trait].dataType ) {
      this._filterData(submitData, `${Trait.actorKeyPath(this.options.trait)}.value`);
    }
    return submitData;
  }

  /* -------------------------------------------- */

  /**
   * Filter and order list of traits before submission.
   * @param {object} submitData  Form submission data.
   * @param {string} keyPath     Path to the trait to modify.
   * @protected
   */
  _filterData(submitData, keyPath) {
    foundry.utils.setProperty(submitData, keyPath, filteredKeys(
      foundry.utils.getProperty(submitData, keyPath) ?? {}
    ).sort((a, b) => a.localeCompare(b, "en")));
  }
}
