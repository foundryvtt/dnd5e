import ItemDataModel from "../abstract/item-data-model.mjs";
import IdentifierField from "../fields/identifier-field.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

const { ArrayField, NumberField, SchemaField } = foundry.data.fields;

/**
 * @import { ItemDescriptionTemplate } from "./templates/_types.mjs";
 */

/**
 * Data definition for Renown items.
 * @extends {ItemDataModel<ItemDescriptionTemplate>}
 * @mixes ItemDescriptionTemplateData
 */
export default class RenownData extends ItemDataModel.mixin(ItemDescriptionTemplate) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.RENOWN", "DND5E.SOURCE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      modifiers: new ArrayField(new SchemaField({
        faction: new IdentifierField({ required: true, blank: true }),
        value: new NumberField({ required: true, integer: true, initial: 0 })
      }))
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [{ label: _loc(CONFIG.Item.typeLabels.renown) }];
    context.parts = ["dnd5e.details-renown"];
    const factionOptions = dnd5e.registry.renown.factionOptions;
    context.info = (context.source.modifiers ?? [])
      .filter(({ faction, value }) => faction && value)
      .map(({ faction, value }) => ({
        label: dnd5e.registry.renown.get(faction)?.name ?? faction,
        value: dnd5e.utils.formatModifier(value)
      }));
    context.modifiers = (context.source.modifiers ?? []).map((data, index) => ({
      data,
      fields: context.fields.modifiers.element.fields,
      options: data.faction && !dnd5e.registry.renown.get(data.faction)
        ? [...factionOptions, { value: data.faction, label: data.faction }]
        : factionOptions,
      prefix: `system.modifiers.${index}.`
    }));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.prepareDescriptionData();
  }
}
