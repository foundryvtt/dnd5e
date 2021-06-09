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

  /** @override */
  get id() {
    return `proficiency-selector-${this.object.id}`;
  }

  /* -------------------------------------------- */

  /**
   * Return a reference to the target attribute
   * @type {string}
   */
  get attribute() {
    return this.options.name;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Get the source object value
    let attr = foundry.utils.getProperty(this.object.toJSON(), this.attribute);
    if ( foundry.utils.getType(attr) !== "Object" ) attr = {value: [], custom: ""};

    const categories = foundry.utils.getProperty(CONFIG.DND5E, `${this.options.type}Proficiencies`);
    const ids = foundry.utils.getProperty(CONFIG.DND5E, `${this.options.type}Ids`);

    const pack = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS);

    let choices = Object.entries(categories).reduce((obj, [key, label]) => {
      obj[key] = {
        label: label,
        chosen: attr ? attr.value.includes(key) : false
      }
      return obj;
    }, {});

    if ( ids !== undefined ) {
      const typeProperty = (this.options.type !== "armor") ? `${this.options.type}Type` : `armor.type`;
      for ( const [key, id] of Object.entries(ids) ) {
        const item = await pack.getDocument(id);
        let type = foundry.utils.getProperty(item.data.data, typeProperty);
        type = (this.options.type !== "weapon") ? type : type.slice(0, 3);
        const entry = {
          label: item.name,
          chosen: attr ? attr.value.includes(key) : false
        };
        if ( choices[type] === undefined ) {
          choices[key] = entry;
        } else {
          if ( choices[type].children === undefined ) {
            choices[type].children = {};
          }
          choices[type].children[key] = entry;
        }
      }
    }

    return {
      allowCustom: this.options.allowCustom,
      choices: choices,
      custom: attr ? attr.custom : ""
    }
  }

}
