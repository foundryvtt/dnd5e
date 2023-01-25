import TraitSelector from "./trait-selector.mjs";
import * as Trait from "../../documents/actor/trait.mjs";

/**
 * A specialized version of the TraitSelector used for selecting tool and vehicle proficiencies.
 * @extends {TraitSelector}
 */
export default class ToolSelector extends TraitSelector {
  /** @inheritdoc */
  async getData() {
    return {
      ...super.getData(),
      choices: await Trait.choices(this.trait, Object.entries(this.document.system.tools).reduce((set, [key, tool]) => {
        if ( tool.value > .5 ) set.add(key);
        return set;
      }, new Set()))
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _getActorOverrides() {
    return Object.keys(foundry.utils.flattenObject(this.document.overrides));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    return this.document.update(Object.entries(formData).reduce((obj, [k, v]) => {
      const [, key] = k.split(".");
      const tool = this.document.system.tools[key];
      if ( tool && !v ) obj[`system.tools.-=${key}`] = null;
      else if ( !tool && v ) obj[`system.tools.${key}`] = {value: 1};
      return obj;
    }, {}));
  }
}
