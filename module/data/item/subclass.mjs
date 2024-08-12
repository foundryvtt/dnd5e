import { ItemDataModel } from "../abstract.mjs";
import AdvancementField from "../fields/advancement-field.mjs";
import IdentifierField from "../fields/identifier-field.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

const { ArrayField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data definition for Subclass items.
 * @mixes ItemDescriptionTemplate
 *
 * @property {string} identifier       Identifier slug for this subclass.
 * @property {string} classIdentifier  Identifier slug for the class with which this subclass should be associated.
 * @property {object[]} advancement    Advancement objects for this subclass.
 * @property {object} spellcasting              Details on subclass's spellcasting ability.
 * @property {string} spellcasting.progression  Spell progression granted by class as from `DND5E.spellProgression`.
 * @property {string} spellcasting.ability      Ability score to use for spellcasting.
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
      spellcasting: new SchemaField({
        progression: new StringField({
          required: true, initial: "none", blank: false, label: "DND5E.SpellProgression"
        }),
        ability: new StringField({ required: true, label: "DND5E.SpellAbility" })
      }, { label: "DND5E.Spellcasting" })
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [{ label: context.itemType }];
    context.parts = ["dnd5e.details-subclass", "dnd5e.details-spellcasting"];
  }
}
