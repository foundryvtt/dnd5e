import TraitSelector from "./trait-selector.mjs";
import * as Trait from "../documents/actor/trait.mjs";

/**
 * An application for selecting proficiencies with categories that can contain children.
 * @deprecated since dnd5e 2.1, targeted for removal in 2.3
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
    const attr = foundry.utils.getProperty(this.object, this.attribute);
    const chosen = (this.options.valueKey) ? foundry.utils.getProperty(attr, this.options.valueKey) ?? [] : attr;

    const data = super.getData();
    data.choices = await Trait.choices(this.options.type, chosen);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * A static helper method to get a list of choices for a proficiency type.
   *
   * @param {string} type               Proficiency type to select, either `armor`, `tool`, or `weapon`.
   * @param {string[]} [chosen]         Optional list of items to be marked as chosen.
   * @returns {Object<string, SelectChoices>}  Object mapping proficiency ids to choice objects.
   * @deprecated since dnd5e 2.1, targeted for removal in 2.3
   */
  static async getChoices(type, chosen=[]) {
    foundry.utils.logCompatibilityWarning(
      "ProficiencySelector#getChoices has been deprecated in favor of Trait#choices.",
      { since: "DnD5e 2.1", until: "DnD5e 2.3" }
    );
    return Trait.choices(type, chosen);
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
   * @deprecated since dnd5e 2.1, targeted for removal in 2.3
   */
  static getBaseItem(identifier, options) {
    foundry.utils.logCompatibilityWarning(
      "ProficiencySelector#getBaseItem has been deprecated in favor of Trait#getBaseItem.",
      { since: "DnD5e 2.1", until: "DnD5e 2.3" }
    );
    return Trait.getBaseItem(identifier, options);
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
