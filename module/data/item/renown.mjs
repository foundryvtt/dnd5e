import ItemDataModel from "../abstract/item-data-model.mjs";
import IdentifierField from "../fields/identifier-field.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

const { ArrayField, NumberField, SchemaField } = foundry.data.fields;

/**
 * @import { RenownItemSystemData } from "./_types.mjs";
 * @import { ItemDescriptionTemplateData } from "./templates/_types.mjs";
 */

/**
 * Data definition for Renown items.
 * @extends {ItemDataModel<ItemDescriptionTemplate & RenownItemSystemData>}
 * @mixes ItemDescriptionTemplateData
 * @mixes RenownItemSystemData
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
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Properties displayed on the item card.
   * @type {object[]}
   */
  get cardProperties() {
    return this.modifiers
      .filter(({ faction, value }) => faction && value)
      .map(({ faction, value }) => ({ type: "renown", faction, value }));
  }

  /* -------------------------------------------- */

  /**
   * Properties displayed in chat.
   * @type {object[]}
   */
  get chatProperties() {
    return this.cardProperties;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.singleDescription = true;
    context.subtitles = [{ label: _loc(CONFIG.Item.typeLabels.renown) }];
    context.parts = ["dnd5e.details-renown"];
    const factionOptions = dnd5e.registry.renown.factionOptions;
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
