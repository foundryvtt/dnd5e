import TraitSelector from "./trait-selector.js";

/**
 * An application for selecting proficiencies with categories that can contain children.
 *
 * @extends {TraitSelector}
 */
export default class ProficiencySelector extends TraitSelector {

  /**
   * Cached version of the base items compendia indices with the needed subtype fields.
   * @type {object}
   */
  static _cachedIndices = {};

  /* -------------------------------------------- */

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
    const chosen = (this.options.valueKey) ? foundry.utils.getProperty(attr, this.options.valueKey) ?? [] : attr;

    const data = super.getData();
    data.choices = await this.constructor.getChoices(this.options.type, chosen, this.options.sortCategories);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Structure representing proficiency choices split into categories.
   *
   * @typedef {object} ProficiencyChoice
   * @property {string} label                    Localized label for the choice.
   * @property {boolean} chosen                  Should this choice be selected by default?
   * @property {ProficiencyChoice[]} [children]  Array of children if this is a category.
   */

  /**
   * A static helper method to get a list of choices for a proficiency type.
   *
   * @param {string} type               Proficiency type to select, either `armor`, `tool`, or `weapon`.
   * @param {string[]} [chosen]         Optional list of items to be marked as chosen.
   * @returns {object<string, ProficiencyChoice>}  Object mapping proficiency ids to choice objects.
   */
  static async getChoices(type, chosen=[]) {
    let data = Object.entries(CONFIG.DND5E[`${type}Proficiencies`]).reduce((obj, [key, label]) => {
      obj[key] = { label: label, chosen: chosen.includes(key) };
      return obj;
    }, {});

    const ids = CONFIG.DND5E[`${type}Ids`];
    const map = CONFIG.DND5E[`${type}ProficienciesMap`];
    if ( ids !== undefined ) {
      const typeProperty = (type !== "armor") ? `${type}Type` : "armor.type";
      for ( const [key, id] of Object.entries(ids) ) {
        const item = await this.getBaseItem(id);
        if ( !item ) continue;

        let type = foundry.utils.getProperty(item.data, typeProperty);
        if ( map && map[type] ) type = map[type];
        const entry = {
          label: item.name,
          chosen: chosen.includes(key)
        };
        if ( data[type] === undefined ) {
          data[key] = entry;
        } else {
          if ( data[type].children === undefined ) {
            data[type].children = {};
          }
          data[type].children[key] = entry;
        }
      }
    }

    if ( type === "tool" ) {
      data.vehicle.children = Object.entries(CONFIG.DND5E.vehicleTypes).reduce((obj, [key, label]) => {
        obj[key] = { label: label, chosen: chosen.includes(key) };
        return obj;
      }, {});
      data = this._sortObject(data);
    }

    for ( const category of Object.values(data) ) {
      if ( !category.children ) continue;
      category.children = this._sortObject(category.children);
    }

    return data;
  }

  /* -------------------------------------------- */

  /**
   * Fetch an item for the provided ID. If the provided ID contains a compendium pack name
   * it will be fetched from that pack, otherwise it will be fetched from the compendium defined
   * in `DND5E.sourcePacks.ITEMS`.
   *
   * @param {string} identifier            Simple ID or compendium name and ID separated by a dot.
   * @param {object} [options]
   * @param {boolean} [options.indexOnly]  If set to true, only the index data will be fetched (will never return
   *                                       Promise).
   * @param {boolean} [options.fullItem]   If set to true, the full item will be returned as long as `indexOnly` is
   *                                       false.
   * @returns {Promise<Item5e>|object}     Promise for a `Document` if `indexOnly` is false & `fullItem` is true,
   *                                       otherwise else a simple object containing the minimal index data.
   */
  static getBaseItem(identifier, { indexOnly=false, fullItem=false }={}) {
    let pack = CONFIG.DND5E.sourcePacks.ITEMS;
    let [scope, collection, id] = identifier.split(".");
    if ( scope && collection ) pack = `${scope}.${collection}`;
    if ( !id ) id = identifier;
  
    const packObject = game.packs.get(pack);

    // Full Item5e document required, always async.
    if ( fullItem && !indexOnly ) {
      return packObject?.getDocument(id);
    }

    const cache = this._cachedIndices[pack];
    const loading = cache instanceof Promise;

    // Return extended index if cached, otherwise normal index, guaranteed to never be async.
    if ( indexOnly ) {
      const index = packObject?.index.get(id);
      return loading ? index : cache?.[id] ?? index;
    }

    // Returned cached version of extended index if available.
    if ( loading ) return cache.then(() => this._cachedIndices[pack][id]);
    else if ( cache ) return cache[id];
    if ( !packObject ) return;

    // Build the extended index and return a promise for the data
    const promise = packObject.getIndex({
      fields: ["data.armor.type", "data.toolType", "data.weaponType"]
    }).then(index => {
      const store = index.reduce((obj, entry) => {
        obj[entry._id] = entry;
        return obj;
      }, {});
      this._cachedIndices[pack] = store;
      return store[id];
    });
    this._cachedIndices[pack] = promise;
    return promise;
  }

  /* -------------------------------------------- */

  /**
   * Take the provided object and sort by the "label" property.
   *
   * @param {object} object  Object to be sorted.
   * @returns {object}        Sorted object.
   * @private
   */
  static _sortObject(object) {
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
