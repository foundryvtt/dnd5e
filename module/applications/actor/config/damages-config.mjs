import FormulaField from "../../../data/fields/formula-field.mjs";
import SelectChoices from "../../../documents/actor/select-choices.mjs";
import * as Trait from "../../../documents/actor/trait.mjs";
import TraitsConfig from "./traits-config.mjs";

/**
 * Configuration application for actor's damage resistances, immunities, and vulnerabilities.
 */
export default class DamagesConfig extends TraitsConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["damages-config"]
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    traits: {
      template: "systems/dnd5e/templates/actors/config/damages-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get otherLabel() {
    return game.i18n.localize("DND5E.DamageTypes");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.bypasses = new SelectChoices(Object.entries(CONFIG.DND5E.itemProperties).reduce((obj, [k, v]) => {
      if ( v.isPhysical ) obj[k] = {
        label: v.label,
        chosen: context.data.bypasses.includes(k),
        icon: { src: k, svg: false }
      };
      return obj;
    }, {}));
    context.value = {};
    if ( this.options.trait === "dm" ) {
      context.choices.forEach((key, data) => data.chosen = context.data.amount[key] ?? "");
      context.bypassHint = "DND5E.DamageModification.BypassHint";
      context.hint = "DND5E.DamageModification.Hint";
      context.value.field = new FormulaField({ determinstic: true });
      context.value.key = "amount";
    } else {
      context.bypassHint = "DND5E.DamagePhysicalBypassHint";
      context.value.field = context.checkbox;
      context.value.input = context.inputs.createCheckboxInput;
      context.value.key = "value";
    }
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _processChoice(data, key, choice, categoryChosen=false) {
    super._processChoice(data, key, choice, categoryChosen);
    const config = CONFIG.DND5E.damageTypes[key];
    if ( config ) choice.icon = { src: config.icon, svg: config.icon.endsWith(".svg") };
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);
    if ( this.options.trait === "dm" ) {
      for ( const [type, formula] of Object.entries(submitData.system?.traits?.dm?.amount ?? {}) ) {
        if ( !formula ) {
          delete submitData.system.traits.dm.amount[type];
          submitData.system.traits.dm.amount[`-=${type}`] = null;
        }
      }
    }
    this._filterData(submitData, `${Trait.actorKeyPath(this.options.trait)}.bypasses`);
    return submitData;
  }
}
