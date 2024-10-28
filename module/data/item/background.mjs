import { ItemDataModel } from "../abstract.mjs";
import AdvancementField from "../fields/advancement-field.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import StartingEquipmentTemplate from "./templates/starting-equipment.mjs";

const { ArrayField } = foundry.data.fields;

/**
 * Data definition for Background items.
 * @mixes ItemDescriptionTemplate
 * @mixes StartingEquipmentTemplate
 *
 * @property {object[]} advancement  Advancement objects for this background.
 */
export default class BackgroundData extends ItemDataModel.mixin(ItemDescriptionTemplate, StartingEquipmentTemplate) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.SOURCE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      advancement: new ArrayField(new AdvancementField(), {label: "DND5E.AdvancementTitle"})
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    singleton: true
  }, {inplace: false}));

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.prepareDescriptionData();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [{ label: context.itemType }];
    context.singleDescription = true;
    context.parts = ["dnd5e.details-background", "dnd5e.details-starting-equipment"];
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if ( (game.user.id !== userId) || this.parent.actor?.type !== "character" ) return;
    this.parent.actor.update({"system.details.background": this.parent.id});
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preDelete(options, user) {
    if ( (await super._preDelete(options, user)) === false ) return false;
    if ( this.parent.actor?.type !== "character" ) return;
    await this.parent.actor.update({"system.details.background": null});
  }
}
