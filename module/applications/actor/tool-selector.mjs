import TraitSelector from "./trait-selector.mjs";
import * as Trait from "../../documents/actor/trait.mjs";

/**
 * A specialized version of the TraitSelector used for selecting tool and vehicle proficiencies.
 * @extends {TraitSelector}
 */
export default class ToolSelector extends TraitSelector {
  /** @inheritDoc */
  async getData() {
    return {
      ...super.getData(),
      choices: await Trait.choices(this.trait, { chosen: new Set(Object.keys(this.document.system.tools)) })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getActorOverrides() {
    return Object.keys(foundry.utils.flattenObject(this.document.overrides));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    return this.document.update(Object.entries(formData).reduce((obj, [k, v]) => {
      const [, key] = k.split(".");
      const tool = this.document.system.tools[key];
      const config = CONFIG.DND5E.tools[key];
      if ( tool && !v ) obj[`system.tools.-=${key}`] = null;
      else if ( !tool && v ) obj[`system.tools.${key}`] = { value: 1, ability: config?.ability || "int" };
      return obj;
    }, {}));
  }
}
