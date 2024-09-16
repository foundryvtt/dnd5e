const { ArrayField, BooleanField, NumberField, SetField, SchemaField, StringField } = foundry.data.fields;

/**
 * Map legacy languages to their new locations in the modern rules.
 * @type {Record<string, string>}
 */
const LEGACY_LANGUAGE_MAP = {
  "languages:exotic:draconic": "languages:standard:draconic",
  "languages:cant": "languages:exotic:cant",
  "languages:druidic": "languages:exotic:druidic"
};

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
 * @property {string} mode                Method by which this advancement modifies the actor's traits.
 * @property {boolean} allowReplacements  Whether all potential choices should be presented to the user if there
 *                                        are no more choices available in a more limited set.
 * @property {string[]} grants            Keys for traits granted automatically.
 * @property {TraitChoice[]} choices      Choices presented to the user.
 */
export class TraitConfigurationData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      mode: new StringField({ initial: "default", label: "DND5E.AdvancementTraitMode" }),
      allowReplacements: new BooleanField({
        required: true, label: "DND5E.AdvancementTraitAllowReplacements",
        hint: "DND5E.AdvancementTraitAllowReplacementsHint"
      }),
      grants: new SetField(new StringField(), { required: true, label: "DND5E.AdvancementTraitGrants" }),
      choices: new ArrayField(new SchemaField({
        count: new NumberField({
          required: true, positive: true, integer: true, initial: 1, label: "DND5E.AdvancementTraitCount"
        }),
        pool: new SetField(new StringField(), { required: false, label: "DOCUMENT.Items" })
      }), { label: "DND5E.AdvancementTraitChoices" })
    };
  }

  /* -------------------------------------------- */

  get hint() {
    foundry.utils.logCompatibilityWarning(
      "Advancement hints are now part of the base data model.",
      { since: "DnD5e 3.3", until: "DnD5e 4.1" }
    );
    return this.parent.hint ?? "";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    if ( (game.settings.get("dnd5e", "rulesVersion") === "legacy") || !source.grants?.length ) return;
    source.grants = source.grants.map(t => LEGACY_LANGUAGE_MAP[t] ?? t);
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
}
