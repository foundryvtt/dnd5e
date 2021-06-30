import TraitSelector from "./trait-selector.js";

/**
 * An application for selecting proficiencies with categories that can contain children.
 *
 * @extends {TraitSelector}
 */
export default class ProficiencySelector extends TraitSelector {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Actor Proficiency Selection",
      type: ""
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const attr = foundry.utils.getProperty(this.object.data, this.attribute);
    const value = (this.options.valueKey) ? foundry.utils.getProperty(attr, this.options.valueKey) ?? [] : attr;

    this.options.choices = CONFIG.DND5E[`${this.options.type}Proficiencies`];
    const data = super.getData();

    const pack = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS);
    const ids = CONFIG.DND5E[`${this.options.type}Ids`];
    const map = CONFIG.DND5E[`${this.options.type}ProficienciesMap`];
    if ( ids !== undefined ) {
      const typeProperty = (this.options.type !== "armor") ? `${this.options.type}Type` : `armor.type`;
      for ( const [key, id] of Object.entries(ids) ) {
        const item = await pack.getDocument(id);
        let type = foundry.utils.getProperty(item.data.data, typeProperty);
        if ( map && map[type] ) type = map[type];
        const entry = {
          label: item.name,
          chosen: attr ? value.includes(key) : false
        };
        if ( data.choices[type] === undefined ) {
          data.choices[key] = entry;
        } else {
          if ( data.choices[type].children === undefined ) {
            data.choices[type].children = {};
          }
          data.choices[type].children[key] = entry;
        }
      }
    }

    return data;
  }

}
