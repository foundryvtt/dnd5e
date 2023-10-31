import SystemDataModel from "../abstract.mjs";
import { AdvancementField } from "../fields.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

/**
 * Data definition for Background items.
 * @mixes ItemDescriptionTemplate
 *
 * @property {object[]} advancement  Advancement objects for this background.
 */
export default class BackgroundData extends SystemDataModel.mixin(ItemDescriptionTemplate) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      advancement: new foundry.data.fields.ArrayField(new AdvancementField(), {label: "DND5E.AdvancementTitle"})
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static metadata = Object.freeze({
    singleton: true
  });

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  _onCreate(data, options, userId) {
    if ( (game.user.id !== userId) || this.parent.actor?.type !== "character" ) return;
    this.parent.actor.update({"system.details.background": this.parent.id});
  }

  /* -------------------------------------------- */

  async _preDelete(options, user) {
    if ( this.parent.actor?.type !== "character" ) return;
    await this.parent.actor.update({"system.details.background": null});
  }
}
