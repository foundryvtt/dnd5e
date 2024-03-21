import { filteredKeys } from "../../utils.mjs";
import BaseConfig from "./base-config.mjs";

/**
 * Configuration app for damage modification.
 */
export default class DamageModificationConfig extends BaseConfig {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "damage-modification", "trait-selector", "subconfig"],
      template: "systems/dnd5e/templates/apps/damage-modification-config.hbs",
      width: 320,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return game.i18n.localize("DND5E.DamageModification.Label");
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = await super.getData(options);
    const data = foundry.utils.getProperty(this.document, "system.traits.dm");
    context.bypasses = Object.entries(CONFIG.DND5E.itemProperties).reduce((obj, [k, v]) => {
      if ( v.isPhysical ) obj[k] = { ...v, chosen: data.bypasses.has(k) };
      return obj;
    }, {});
    context.modifications = Object.entries(CONFIG.DND5E.damageTypes).reduce((obj, [k, v]) => {
      obj[k] = {
        ...v,
        value: data.amount[k]
      };
      return obj;
    }, {});
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getActorOverrides() {
    const overrides = super._getActorOverrides();
    this._addOverriddenChoices("system.traits.dm.bypasses", "system.traits.dm.bypasses", overrides);
    return overrides;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getSubmitData(updateData) {
    const data = foundry.utils.expandObject(super._getSubmitData(updateData));
    const formData = {};
    for ( const [type, formula] of Object.entries(foundry.utils.getProperty(data, "system.traits.dm.amount")) ) {
      if ( formula ) formData[`system.traits.dm.amount.${type}`] = formula;
      else formData[`system.traits.dm.amount.-=${type}`] = "";
    }
    formData["system.traits.dm.bypasses"] = filteredKeys(
      foundry.utils.getProperty(data, "system.traits.dm.bypasses") ?? {}
    );
    return formData;
  }
}
