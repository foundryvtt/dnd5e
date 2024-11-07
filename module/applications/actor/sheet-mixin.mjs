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
    const { activityId } = input.closest("[data-activity-id]")?.dataset ?? {};
    const activity = target?.system.activities?.get(activityId);
    const result = parseInputDelta(input, activity ?? target);
    if ( result !== undefined ) {
      // Special case handling for Item uses.
      if ( input.dataset.name === "system.uses.value" ) {
        target.update({ "system.uses.spent": target.system.uses.max - result });
      } else if ( activity && (input.dataset.name === "uses.value") ) {
        target.updateActivity(activityId, { "uses.spent": activity.uses.max - result });
      }
      else target.update({ [input.dataset.name]: result });
    }
  }

  /* -------------------------------------------- */

  /**
   * Stack identical consumables when a new one is dropped rather than creating a duplicate item.
   * @param {object} itemData                  The item data requested for creation.
   * @param {object} [options={}]
   * @param {string} [options.container=null]  ID of the container into which this item is being dropped.
   * @returns {Promise<Item5e>|null}           If a duplicate was found, returns the adjusted item stack.
   */
  _onDropStackConsumables(itemData, { container=null }={}) {
    const droppedSourceId = itemData._stats?.compendiumSource ?? itemData.flags.core?.sourceId;
    if ( itemData.type !== "consumable" || !droppedSourceId ) return null;
    const similarItem = this.actor.sourcedItems.get("Compendium.dnd5e.items.Item.ytlsBjYsZ7OBSEBs", { legacy: false })
      ?.filter(i => (i.system.container === container) && (i.name === itemData.name))?.first();
    if ( !similarItem ) return null;
    return similarItem.update({
      "system.quantity": similarItem.system.quantity + Math.max(itemData.system.quantity, 1)
    });
  }
};
