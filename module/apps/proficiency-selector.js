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
      type: "",
      sortCategories: false
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

    if ( this.options.type === "tool" ) {
      data.choices["vehicle"].children = Object.entries(CONFIG.DND5E.vehicleTypes).reduce((obj, [key, label]) => {
        obj[key] = {
          label: label,
          chosen: attr ? value.includes(key) : false
        }
        return obj;
      }, {});
    }

    if ( this.options.sortCategories ) data.choices = this._sortObject(data.choices);
    for ( const category of Object.values(data.choices) ) {
      if ( !category.children ) continue;
      category.children = this._sortObject(category.children);
    }

    return data;
  }

  /* -------------------------------------------- */

  /**
   * Take the provided object and sort by the "label" property.
   *
   * @param {object} object  Object to be sorted.
   * @return {object}        Sorted object.
   * @private
   */
  _sortObject(object) {
    return Object.fromEntries(Object.entries(object).sort((lhs, rhs) =>
      lhs[1].label.localeCompare(rhs[1].label)
    ));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    for ( const checkbox of html[0].querySelectorAll("input[type='checkbox']") ) {
      if ( checkbox.checked ) this._onToggleCategory(checkbox);
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    super._onChangeInput(event);

    if ( event.target.tagName === "INPUT" ) this._onToggleCategory(event.target);
  }

  /* -------------------------------------------- */

  /**
   * Enable/disable all children when a category is checked.
   *
   * @param {HTMLElement} checkbox  Checkbox that was changed.
   * @private
   */
  _onToggleCategory(checkbox) {
    const children = checkbox.closest("li")?.querySelector("ol");
    if ( !children ) return;

    for ( const child of children.querySelectorAll("input[type='checkbox']") ) {
      child.checked = child.disabled = checkbox.checked;
    }
  }

}
