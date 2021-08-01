import ProficiencySelector from "./proficiency-selector.js";


/**
 * Configuration for a specific trait grant.
 *
 * @typedef {object} TraitGrant
 * @property {number} count        How many traits can be selected.
 * @property {string[]} [choices]  List of trait or category keys that can be chosen. If no choices
 *                                 are provided, any trait of the specified type can be selected.
 */


/**
 * A form used to configure player choices for skill, tool, language, and other proficiencies
 * on Background and Class items.
 * @extends {DocumentSheet}
 */
export default class TraitConfiguration extends DocumentSheet {

  /**
   * Index of the selected grant configuration.
   * @type {number}
   */
  selectedIndex = 0;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trait-configuration",
      classes: ["dnd5e", "trait-configuration", "subconfig"],
      title: "Trait Configuration",
      template: "systems/dnd5e/templates/apps/trait-configuration.html",
      width: 540,
      height: 680,
      type: ""
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {

    let grants = foundry.utils.getProperty(this.object.data, `${this.options.name}.grants`);
    grants = grants.map((grant, index) => {
      return {
        label: TraitConfiguration.grantLabel(this.options.type, grant),
        data: grant,
        selected: index === this.selectedIndex
      }
    });

    const selectedData = grants[this.selectedIndex]?.data;
    const chosen = (typeof selectedData === "string") ? [selectedData] : selectedData?.choices ?? [];
    let choices;
    if ( ["armor", "tool", "weapon"].includes(this.options.type) ) {

      /****************************************************************************/
      /*             TODO: Refactor out this code when !335 is merged             */
      /****************************************************************************/
      const type = this.options.type;
      choices = Object.entries(CONFIG.DND5E[`${type}Proficiencies`]).reduce((obj, [key, label]) => {
        obj[key] = { label: label, chosen: chosen?.includes(key) ?? false };
        return obj;
      }, {});
      const ids = CONFIG.DND5E[`${type}Ids`];
      const map = CONFIG.DND5E[`${type}ProficienciesMap`];
      if ( ids !== undefined ) {
        const typeProperty = (type !== "armor") ? `${type}Type` : `armor.type`;
        for ( const [key, id] of Object.entries(ids) ) {
          const pack = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS);
          const item = await pack.getDocument(id);
          if ( !item ) continue;
          let type = foundry.utils.getProperty(item.data.data, typeProperty);
          if ( map && map[type] ) type = map[type];
          const entry = {
            label: item.name,
            chosen: chosen?.includes(key) ?? false
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
      if ( type === "tool" ) {
        choices["vehicle"].children = Object.entries(CONFIG.DND5E.vehicleTypes).reduce((obj, [key, label]) => {
          obj[key] = { label: label, chosen: chosen?.includes(key) ?? false };
          return obj;
        }, {});
      }
      if ( type === "tool" ) choices = ProficiencySelector._sortObject(choices);
      for ( const category of Object.values(choices) ) {
        if ( !category.children ) continue;
        category.children = ProficiencySelector._sortObject(category.children);
      }
      /****************************************************************************/
      /*                                End Refactor                              */
      /****************************************************************************/


    } else {
      choices = Object.entries(CONFIG.DND5E[this.options.type] ?? {}).reduce((obj, [key, label]) => {
        obj[key] = {
          label,
          chosen: chosen.includes(key)
        };
        return obj;
      }, {});
    }

    return {
      grants,
      allowChoices: typeof grants[this.selectedIndex]?.data === "object",
      count: grants[this.selectedIndex]?.count ?? 1,
      choices
    }
  }

  /* -------------------------------------------- */

  /**
   * Create a human readable description of the provided grant.
   * @param {string} type             
   * @param {string|TraitGrant} data  
   */
  static grantLabel(type, data) {
    // Single trait
    if ( typeof data === "string" ) {
      return TraitConfiguration.keyLabel(type, data);
    }

    const typeLabel = TraitConfiguration.typeLabel(type).toLowerCase();
    // Select from all options
    if ( !data.choices ) {
      return `Choose ${data.count} ${typeLabel}`; // TODO: Localize
    }

    const choices = data.choices.map(key => TraitConfiguration.keyLabel(type, key));
    const listFormatter = new Intl.ListFormat(game.i18n.lang, { type: "disjunction" });
    return `Choose ${data.count} from ${listFormatter.format(choices)}`; // TODO: Localize
  }

  /* -------------------------------------------- */

  /**
   * Get the localized label for a specific trait type.
   * @param {string} type  Trait type.
   * @return {string}      Localized label.
   */
  static typeLabel(type) {
    const typeCap = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

    // TODO: Localize this correctly
    if ( ["armor", "tool", "weapon"].includes(type) ) {
      return game.i18n.localize(`DND5E.Trait${typeCap}Prof`);
    } else {
      return type;
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the localized label for a specific key.
   * @param {string} type  
   * @param {string} key   
   * @return {string}
   */
  static keyLabel(type, key) {
    if ( ["armor", "tool", "weapon"].includes(type) ) {
      const categories = CONFIG.DND5E[`${type}Proficiencies`];
      if ( categories[key] ) return categories[key];

      if ( type === "tool" && CONFIG.DND5E.vehicleTypes[key] ) {
        return CONFIG.DND5E.vehicleTypes[key];
      }

      // TODO: Replace with ProficiencySelector#getBaseItem when !335 is merged
      const pack = game.packs.get(CONFIG.DND5E.sourcePacks.ITEMS);
      const item = pack.index.get(key);

      return item?.name ?? "";
    } else {
      const source = CONFIG.DND5E[type];
      return source[key] ?? "";
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {

  }
}
