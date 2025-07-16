import MappingField from "../fields/mapping-field.mjs";
import SpellConfigurationData from "./spell-config.mjs";

const {
  ArrayField, BooleanField, EmbeddedDataField, ForeignDocumentField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

/**
 * Configuration data for choice levels.
 *
 * @typedef {object} ItemChoiceLevelConfig
 * @property {number} count         Number of items a player can select at this level.
 * @property {boolean} replacement  Can a player replace previous selections at this level?
 */

/**
 * Configuration data for an individual pool entry.
 *
 * @typedef {object} ItemChoicePoolEntry
 * @property {string} uuid  UUID of the item to present as a choice.
 */

/**
 * Configuration data for Item Choice advancement.
 *
 * @property {boolean} allowDrops                             Should players be able to drop non-listed items?
 * @property {Record<number, ItemChoiceLevelConfig>} choices  Choices & config for specific levels.
 * @property {ItemChoicePoolEntry[]} pool                     Items that can be chosen.
 * @property {object} restriction
 * @property {"available"|number} restriction.level           Level of spell allowed.
 * @property {Set<string>} restriction.list                   Spell lists from which a spell must be selected.
 * @property {string} restriction.subtype                     Item sub-type allowed.
 * @property {string} restriction.type                        Specific item type allowed.
 * @property {SpellConfigurationData} spell                   Mutations applied to spell items.
 * @property {string} type                                    Type of item allowed, if it should be restricted.
 */
export class ItemChoiceConfigurationData extends foundry.abstract.DataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ADVANCEMENT.ItemChoice", "DND5E.ADVANCEMENT.SPELLCONFIG"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      allowDrops: new BooleanField({ initial: true }),
      choices: new MappingField(new SchemaField({
        count: new NumberField({integer: true, min: 0}),
        replacement: new BooleanField()
      })),
      pool: new ArrayField(new SchemaField({ uuid: new StringField() })),
      restriction: new SchemaField({
        level: new StringField(),
        list: new SetField(new StringField()),
        subtype: new StringField(),
        type: new StringField()
      }),
      spell: new EmbeddedDataField(SpellConfigurationData, { nullable: true, initial: null }),
      type: new StringField({ blank: false, nullable: true, initial: null })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    if ( "choices" in source ) Object.entries(source.choices).forEach(([k, c]) => {
      if ( foundry.utils.getType(c) === "number" ) source.choices[k] = { count: c };
    });
    if ( "pool" in source ) {
      source.pool = source.pool.map(i => foundry.utils.getType(i) === "string" ? { uuid: i } : i);
    }
    if ( source.spell ) SpellConfigurationData.migrateData(source.spell);
    return source;
  }
}

/**
 * Data for a replacement.
 *
 * @typedef {object} ItemChoiceReplacement
 * @property {number} level        Level at which the original item was chosen.
 * @property {string} original     ID of the original item that was replaced.
 * @property {string} replacement  ID of the replacement item.
 */

/**
 * Value data for Item Choice advancement.
 *
 * @property {string} ability                                  Ability selected for the spells.
 * @property {Record<number, Record<string, string>>} added    Mapping of IDs to UUIDs for items added at each level.
 * @property {Record<number, ItemChoiceReplacement>} replaced  Information on items replaced at each level.
 */
export class ItemChoiceValueData extends foundry.abstract.DataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ability: new StringField(),
      added: new MappingField(new MappingField(new StringField())),
      replaced: new MappingField(new SchemaField({
        level: new NumberField({integer: true, min: 0}),
        original: new ForeignDocumentField(foundry.documents.BaseItem, {idOnly: true}),
        replacement: new ForeignDocumentField(foundry.documents.BaseItem, {idOnly: true})
      }))
    };
  }
}
