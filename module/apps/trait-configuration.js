import ProficiencySelector from "./proficiency-selector.js";

/**
 * A form used to configure player choices for skill, tool, language, and other proficiencies
 * on Background and Class items.
 * @extends {DocumentSheet}
 */
export default class TraitConfiguration extends DocumentSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trait-configuration",
      classes: ["dnd5e", "trait-configuration", "subconfig"],
      title: "Trait Configuration",
      template: "systems/dnd5e/templates/apps/trait-configuration.html",
      width: 320,
      height: "auto",
      type: ""
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {

    const chosen = [];
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
        obj[key] = { label };
        return obj;
      }, {});
    }

    return {
      choices
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {

  }
}
