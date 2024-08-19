import SelectChoices from "../../../documents/actor/select-choices.mjs";
import * as Trait from "../../../documents/actor/trait.mjs";
import { filteredKeys } from "../../../utils.mjs";
import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Configuration application for weapon proficiencies and masteries.
 */
export default class WeaponsConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["weapons", "trait-selector"],
    position: {
      width: 600
    }
  };

  /** @override */
  static PARTS = {
    traits: {
      template: "systems/dnd5e/templates/actors/config/weapons-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("TYPES.Item.weaponPl");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.data = this.document.system.traits.weaponProf;
    context.checkbox = new foundry.data.fields.BooleanField();
    context.choices = await Trait.choices("weapon", { chosen: context.data.value });
    context.fields = this.document.system.schema.fields.traits.fields.weaponProf.fields;

    // Handle custom weapons not in a top-level category
    const other = {
      label: game.i18n.localize("DND5E.WeaponOtherProficiency"),
      children: new SelectChoices(),
      otherGroup: true
    };
    for ( const [key, choice] of Object.entries(context.choices) ) {
      if ( choice.children ) continue;
      other.children[key] = choice;
      delete context.choices[key];
    }
    if ( !foundry.utils.isEmpty(other.children) ) context.choices.other = other;
    this._processChoices(context.data, context.choices);

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Processes the choices to ensure that children are checked if the category is checked and that
   * masteries are only enabled if character has proficiency.
   * @param {object} data                     Weapon proficiency data.
   * @param {SelectChoices} choices           Choices object.
   * @param {boolean} [categoryChosen=false]  Is the category above this one selected?
   */
  _processChoices(data, choices, categoryChosen=false) {
    for ( const [key, choice] of Object.entries(choices) ) {
      if ( categoryChosen ) {
        choice.chosen = true;
        choice.disabled = true;
      }
      choice.mastery = {
        chosen: data.mastery.has(key),
        disabled: !choice.chosen
      };
      if ( choice.children ) this._processChoices(data, choice.children, choice.chosen);
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritdoc */
  _getActorOverrides() {
    const overrides = super._getActorOverrides();
    const path = "system.traits.weaponProf";
    this._addOverriddenChoices(`${path}.value`, `${path}.value`, overrides);
    this._addOverriddenChoices(`${path}.mastery`, `${path}.mastery`, overrides);
    const pathCustom = `${path}.custom`;
    const sourceCustom = foundry.utils.getProperty(this.document._source, pathCustom);
    const currentCustom = foundry.utils.getProperty(this.document, pathCustom);
    if ( sourceCustom !== currentCustom ) overrides.push(pathCustom);
    return overrides;
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);
    this._prepareChoices("system.traits.weaponProf.value", submitData);
    this._prepareChoices("system.traits.weaponProf.mastery", submitData);
    return submitData;
  }

  /* -------------------------------------------- */

  /**
   * Filter a list of choices that begin with the provided key for update.
   * @param {string} keyPath     Path in actor data where the final choices will be saved.
   * @param {object} submitData  Form data being prepared. *Will be mutated.*
   * @internal
   */
  _prepareChoices(keyPath, submitData) {
    const chosen = new Set(filteredKeys(foundry.utils.getProperty(submitData, keyPath) ?? {}));

    // Add choices from the source that have been removed by an override: if we didn't, the override would be persisted
    const source = new Set(foundry.utils.getProperty(this.document._source, keyPath));
    const current = foundry.utils.getProperty(this.document, keyPath);
    for ( const choice of source.difference(current) ) chosen.add(choice);

    foundry.utils.setProperty(submitData, keyPath, Array.from(chosen).sort((a, b) => a.localeCompare(b, "en")));
  }
}
