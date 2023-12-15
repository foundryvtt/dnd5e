import SystemDataModel from "../abstract.mjs";
import { AdvancementField } from "../fields.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ActionTemplate from "./templates/action.mjs";

/**
 * Data definition for Lineage items.
 * @mixes ItemDescriptionTemplate
 *
 * @property {object[]} advancement  Advancement objects for this background.
 */
export default class LineageData extends SystemDataModel.mixin(ItemDescriptionTemplate, ActionTemplate) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      advancement: new foundry.data.fields.ArrayField(new AdvancementField(), {label: "DND5E.AdvancementTitle"})
    });
  }
}
