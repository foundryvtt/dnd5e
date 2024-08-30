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
    context.data = this.document.toObject().system.traits.weaponProf;
    context.checkbox = new foundry.data.fields.BooleanField();
    context.choices = await Trait.choices("weapon", { chosen: new Set(context.data.value) });
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
        chosen: data.mastery.value?.includes(key),
        disabled: !choice.chosen
      };
      if ( choice.children ) this._processChoices(data, choice.children, choice.chosen);
    }
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);
    const filter = keyPath => foundry.utils.setProperty(submitData, keyPath, filteredKeys(
      foundry.utils.getProperty(submitData, keyPath) ?? {}
    ).sort((a, b) => a.localeCompare(b, "en")));
    filter("system.traits.weaponProf.value");
    filter("system.traits.weaponProf.mastery.value");
    return submitData;
  }
}
