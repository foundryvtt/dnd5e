import * as Trait from "../../../documents/actor/trait.mjs";
import TraitsConfig from "./traits-config.mjs";

/**
 * Configuration application for weapon proficiencies and masteries.
 */
export default class WeaponsConfig extends TraitsConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["weapons"],
    trait: "weapon"
  };

  /* -------------------------------------------- */

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
  _processChoice(data, key, choice, categoryChosen=false) {
    super._processChoice(data, key, choice, categoryChosen);
    choice.mastery = {
      chosen: data.mastery.value?.includes(key),
      disabled: !choice.chosen
    };
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);
    this._filterData(submitData, `${Trait.actorKeyPath(this.options.trait)}.mastery.value`);
    return submitData;
  }
}
