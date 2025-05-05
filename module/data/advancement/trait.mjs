const { ArrayField, BooleanField, NumberField, SetField, SchemaField, StringField } = foundry.data.fields;

/**
 * Map language category changes.
 * @type {Record<string, string>}
 */
const _MAP = {
  "languages:exotic:draconic": "languages:standard:draconic",
  "languages:cant": "languages:exotic:cant",
  "languages:druidic": "languages:exotic:druidic"
};

const LANGUAGE_MAP = { modern: _MAP, legacy: foundry.utils.invertObject(_MAP) };

/**
 * Configuration for a specific trait choice.
 *
 * @typedef {object} TraitChoice
 * @property {number} count     Number of traits that can be selected.
 * @property {string[]} [pool]  List of trait or category keys that can be chosen. If no choices are provided,
 *                              any trait of the specified type can be selected.
 */

/**
 * Configuration data for the TraitAdvancement.
 *
 * @property {boolean} allowReplacements  Whether all potential choices should be presented to the user if there
 *                                        are no more choices available in a more limited set.
 * @property {TraitChoice[]} choices      Choices presented to the user.
 * @property {string[]} grants            Keys for traits granted automatically.
 * @property {string} mode                Method by which this advancement modifies the actor's traits.
 */
export class TraitConfigurationData extends foundry.abstract.DataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ADVANCEMENT.Trait"];

  /* -------------------------------------------- */

  static defineSchema() {
    return {
      allowReplacements: new BooleanField({ required: true }),
      choices: new ArrayField(new SchemaField({
        count: new NumberField({ required: true, positive: true, integer: true, initial: 1 }),
        pool: new SetField(new StringField())
      })),
      grants: new SetField(new StringField(), { required: true }),
      mode: new StringField({ required: true, blank: false, initial: "default" })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    super.migrateData(source);
    const version = game.settings.get("dnd5e", "rulesVersion");
    const languageMap = LANGUAGE_MAP[version] ?? {};
    if ( source.grants?.length ) source.grants = source.grants.map(t => languageMap[t] ?? t);
    if ( source.choices?.length ) source.choices.forEach(c => c.pool = c.pool.map(t => languageMap[t] ?? t));
    return source;
  }
}

/**
 * Value data for the TraitAdvancement.
 *
 * @property {Set<string>} chosen  Trait keys that have been chosen.
 */
export class TraitValueData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      chosen: new SetField(new StringField(), { required: false })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    super.migrateData(source);
    const version = game.settings.get("dnd5e", "rulesVersion");
    const languageMap = LANGUAGE_MAP[version] ?? {};
    if ( source.chosen?.length ) source.chosen = source.chosen.map(t => languageMap[t] ?? t);
    return source;
  }
}
