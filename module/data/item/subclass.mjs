import { simplifyBonus } from "../../utils.mjs";
import { ItemDataModel } from "../abstract.mjs";
import AdvancementField from "../fields/advancement-field.mjs";
import IdentifierField from "../fields/identifier-field.mjs";
import SpellcastingField from "./fields/spellcasting-field.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

const { ArrayField } = foundry.data.fields;

/**
 * Data definition for Subclass items.
 * @mixes ItemDescriptionTemplate
 *
 * @property {string} identifier       Identifier slug for this subclass.
 * @property {string} classIdentifier  Identifier slug for the class with which this subclass should be associated.
 * @property {object[]} advancement    Advancement objects for this subclass.
 * @property {SpellcastingField} spellcasting  Details on subclass's spellcasting ability.
 */
export default class SubclassData extends ItemDataModel.mixin(ItemDescriptionTemplate) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      identifier: new IdentifierField({ required: true, label: "DND5E.Identifier" }),
      classIdentifier: new IdentifierField({
        required: true, label: "DND5E.ClassIdentifier", hint: "DND5E.ClassIdentifierHint"
      }),
      advancement: new ArrayField(new AdvancementField(), { label: "DND5E.AdvancementTitle" }),
      spellcasting: new SpellcastingField()
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    this.spellcasting.preparation.value = 0;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData() {
    this.spellcasting.preparation.value ??= 0;
    this.spellcasting.preparation.max = simplifyBonus(
      this.spellcasting.preparation.formula,
      this.parent.getRollData({ deterministic: true})
    );
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [{ label: context.itemType }];
    context.singleDescription = true;
    context.parts = ["dnd5e.details-subclass", "dnd5e.details-spellcasting"];
  }
}
