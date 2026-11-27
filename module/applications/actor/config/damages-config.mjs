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

  /**
   * Equivalent healing trait for this damage trait.
   * @type {string}
   */
  get healingTrait() {
    return this.options.trait.replace("d", "h");
  }

  /* -------------------------------------------- */

  /** @override */
  get otherLabel() {
    return _loc("DND5E.DAMAGE.Types");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _getChoices(trait) {
    const damageChoices = await super._getChoices(trait);
    const healingChoices = await super._getChoices(this.healingTrait);
    return new SelectChoices({
      damage: {
        category: true,
        children: damageChoices,
        label: _loc("DND5E.DAMAGE.Types"),
        selectable: false
      },
      healing: {
        category: true,
        children: healingChoices,
        keyPath: Trait.actorKeyPath(this.healingTrait),
        label: _loc("DND5E.HEAL.Types"),
        selectable: false
      }
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.bypasses = new SelectChoices(Object.entries(CONFIG.DND5E.itemProperties).reduce((obj, [k, v]) => {
      if ( v.isPhysical ) obj[k] = {
        label: v.label,
        chosen: context.data.bypasses.includes(k),
        icon: { src: `fa-solid fa-fw ${k}` }
      };
      return obj;
    }, {}));
    context.healingData = foundry.utils.getProperty(this.document._source, Trait.actorKeyPath(this.healingTrait));
    context.value = {};
    if ( this.options.trait === "dm" ) {
      context.choices.damage.children.forEach((key, data) => data.chosen = context.data.amount[key] ?? "");
      context.choices.healing.children.forEach((key, data) => data.chosen = context.healingData.amount[key] ?? "");
      context.bypassHint = "DND5E.DamageModification.BypassHint";
      context.hint = "DND5E.DamageModification.Hint";
      context.value.field = new FormulaField({ determinstic: true });
      context.value.key = "amount";
    } else {
      context.bypassHint = "DND5E.DAMAGE.PhysicalBypass.Hint";
      context.value.field = context.checkbox;
      context.value.input = context.inputs.createCheckboxInput;
      context.value.key = "value";
    }
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _processChoices(data, choices, category) {
    if ( category?.key === "healing" ) {
      data = foundry.utils.getProperty(this.document._source, Trait.actorKeyPath(this.healingTrait));
    }
    super._processChoices(data, choices, category);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _processChoice(data, key, choice, category) {
    super._processChoice(data, key, choice, category);
    const config = CONFIG.DND5E.damageTypes[key] ?? CONFIG.DND5E.healingTypes[key];
    if ( config && (category?.key !== "SPECIAL") ) choice.icon = { src: config.icon };
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
          submitData.system.traits.dm.amount[type] = _del;
        }
      }
      for ( const [type, formula] of Object.entries(submitData.system?.traits?.hm?.amount ?? {}) ) {
        if ( !formula ) {
          delete submitData.system.traits.hm.amount[type];
          submitData.system.traits.hm.amount[type] = _del;
        }
      }
    }
    this._filterData(submitData, `${Trait.actorKeyPath(this.options.trait)}.bypasses`);
    this._filterData(submitData, `${Trait.actorKeyPath(this.healingTrait)}.value`);
    return submitData;
  }
}
