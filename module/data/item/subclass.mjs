import SystemDataModel from "../abstract.mjs";
import { AdvancementField, IdentifierField } from "../fields.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

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
export default class SubclassData extends SystemDataModel.mixin(ItemDescriptionTemplate) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      identifier: new IdentifierField({required: true, label: "DND5E.Identifier"}),
      classIdentifier: new IdentifierField({
        required: true, label: "DND5E.ClassIdentifier", hint: "DND5E.ClassIdentifierHint"
      }),
      advancement: new foundry.data.fields.ArrayField(new AdvancementField(), {label: "DND5E.AdvancementTitle"}),
      reserve: new foundry.data.fields.SchemaField({
        identifier: new foundry.data.fields.StringField({
          required: false, label: "DND5E.ReserveIdentifier"
        }),
        key: new foundry.data.fields.StringField({required: false, label: "DND5E.ReserveTranslationKey"}),
        formula: new foundry.data.fields.StringField({required: false, label: "DND5E.ReserveFormula"}),
        refresh: new foundry.data.fields.StringField({required: false, initial: "lr", label: "DND5E.ReserveRefresh"})
      }, {label: "DND5E.Reserve"}),
      spellcasting: new foundry.data.fields.SchemaField({
        progression: new foundry.data.fields.StringField({
          required: true, initial: "none", blank: false, label: "DND5E.SpellProgression"
        }),
        ability: new foundry.data.fields.StringField({required: true, label: "DND5E.SpellAbility"})
      }, {label: "DND5E.Spellcasting"})
    });
  }
}
