import { parseInputDelta } from "../../utils.mjs";

/**
 * Mixin method for common uses between all actor sheets.
 * @param {typeof Application} Base   Application class being extended.
 * @returns {class}
 * @mixin
 */
export default Base => class extends Base {
  /**
   * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs.
   * @param {Event} event  Triggering event.
   * @protected
   */
  _onChangeInputDelta(event) {
    const input = event.target;
    const target = this.actor.items.get(input.closest("[data-item-id]")?.dataset.itemId) ?? this.actor;
    const result = parseInputDelta(input, target);
    if ( result !== undefined ) target.update({ [input.dataset.name]: result });
  }

  /* -------------------------------------------- */

  /**
   * Stack identical consumables when a new one is dropped rather than creating a duplicate item.
   * @param {object} itemData         The item data requested for creation.
   * @returns {Promise<Item5e>|null}  If a duplicate was found, returns the adjusted item stack.
   */
  _onDropStackConsumables(itemData) {
    const droppedSourceId = itemData._stats?.compendiumSource ?? itemData.flags.core?.sourceId;
    if ( itemData.type !== "consumable" || !droppedSourceId ) return null;
    const similarItem = this.actor.items.find(i => {
      const sourceId = i.getFlag("core", "sourceId");
      return sourceId && (sourceId === droppedSourceId) && (i.type === "consumable") && (i.name === itemData.name);
    });
    if ( !similarItem ) return null;
    return similarItem.update({
      "system.quantity": similarItem.system.quantity + Math.max(itemData.system.quantity, 1)
    });
  }
};
