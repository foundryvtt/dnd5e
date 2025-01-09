import { defaultUnits, formatDistance, splitSemicolons } from "../../../utils.mjs";
import FormulaField from "../../fields/formula-field.mjs";
import MappingField from "../../fields/mapping-field.mjs";
import DamageTraitField from "../fields/damage-trait-field.mjs";
import SimpleTraitField from "../fields/simple-trait-field.mjs";

const { NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { DamageTraitData } from "./fields/damage-trait.mjs";
 * @import { SimpleTraitData } from "./fields/simple-trait.mjs";
 */

/**
 * Data structure for a damage actor trait.
 *
 * @typedef {object} DamageModificationData
 * @property {Record<string, string>} amount  Damage boost or reduction by damage type.
 * @property {Set<string>} bypasses           Keys for physical properties that cause modification to be bypassed.
 */

/**
 * @typedef {SimpleTraitData} LanguageTraitData
 * @property {Record<string, CommunicationData>} communication  Measured communication ranges (e.g. telepathy).
 */

/**
 * @typedef {object} LanguageCommunicationData
 * @property {string} units  Units used to measure range.
 * @property {number} value  Range to which this ability can be used.
 */

/**
 * Shared contents of the traits schema between various actor types.
 */
export default class TraitsField {

  /* -------------------------------------------- */

  /**
   * Fields shared between characters, NPCs, and vehicles.
   *
   * @type {object}
   * @property {string} size                Actor's size.
   * @property {DamageTraitData} di         Damage immunities.
   * @property {DamageTraitData} dr         Damage resistances.
   * @property {DamageTraitData} dv         Damage vulnerabilities.
   * @property {DamageModificationData} dm  Damage modification.
   * @property {SimpleTraitData} ci         Condition immunities.
   */
  static get common() {
    return {
      size: new StringField({ required: true, initial: "med", label: "DND5E.Size" }),
      di: new DamageTraitField({}, { label: "DND5E.DamImm" }),
      dr: new DamageTraitField({}, { label: "DND5E.DamRes" }),
      dv: new DamageTraitField({}, { label: "DND5E.DamVuln" }),
      dm: new SchemaField({
        amount: new MappingField(new FormulaField({ deterministic: true }), { label: "DND5E.DamMod" }),
        bypasses: new SetField(new StringField(), {
          label: "DND5E.DamagePhysicalBypass", hint: "DND5E.DamagePhysicalBypassHint"
        })
      }),
      ci: new SimpleTraitField({}, { label: "DND5E.ConImm" })
    };
  }

  /* -------------------------------------------- */

  /**
   * Fields shared between characters and NPCs.
   *
   * @type {object}
   * @property {SimpleTraitData} languages  Languages known by this creature.
   */
  static get creature() {
    return {
      languages: new SimpleTraitField({
        communication: new MappingField(new SchemaField({
          units: new StringField({ initial: () => defaultUnits("length") }),
          value: new NumberField({ min: 0 })
        }))
      }, { label: "DND5E.Languages" })
    };
  }

  /* -------------------------------------------- */

  /**
   * Produce the schema field for a simple trait.
   * @param {object} [schemaOptions={}]          Options passed to the outer schema.
   * @param {object} [options={}]
   * @param {string[]} [options.initial={}]      The initial value for the value set.
   * @param {object} [options.extraFields={}]    Additional fields added to schema.
   * @returns {SimpleTraitField}
   */
  static makeSimpleTrait(schemaOptions={}, {initial=[], extraFields={}}={}) {
    foundry.utils.logCompatibilityWarning(
      "The `makeSimpleTrait` method on `TraitsField` has been deprecated and replaced with `SimpleTraitField`.",
      { since: "DnD5e 4.2", until: "DnD5e 4.4" }
    );
    return new SimpleTraitField(extraFields, { initialValue: initial, ...schemaOptions });
  }

  /* -------------------------------------------- */

  /**
   * Produce the schema field for a damage trait.
   * @param {object} [schemaOptions={}]          Options passed to the outer schema.
   * @param {object} [options={}]
   * @param {string[]} [options.initial={}]      The initial value for the value set.
   * @param {object} [options.extraFields={}]    Additional fields added to schema.
   * @returns {DamageTraitField}
   */
  static makeDamageTrait(schemaOptions={}, {initial=[], initialBypasses=[], extraFields={}}={}) {
    foundry.utils.logCompatibilityWarning(
      "The `makeDamageTrait` method on `TraitsField` has been deprecated and replaced with `DamageTraitField`.",
      { since: "DnD5e 4.2", until: "DnD5e 4.4" }
    );
    return new DamageTraitField(extraFields, { initialValue: initial, initialBypasses, ...schemaOptions });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare the language labels.
   * @this {CharacterData|NPCData}
   */
  static prepareLanguages() {
    const languages = this.traits.languages;
    const labels = languages.labels = { languages: [], ranged: [] };

    if ( languages.value.has("ALL") ) labels.languages.push(game.i18n.localize("DND5E.Language.All"));
    else {
      const processCategory = (key, data, group) => {
        // If key is within languages, don't bother with children
        if ( languages.value.has(key) ) (group?.children ?? labels.languages).push(data.label ?? data);

        // Display children as part of this group (e.g. "Primordial (Ignan)")
        else if ( data.children ) {
          const topLevel = group === undefined;
          group ??= { label: data.label, children: [] };
          Object.entries(data.children).forEach(([k, d]) => processCategory(k, d, group));
          if ( topLevel && group.children.length ) labels.languages.push(
            `${data.label} (${game.i18n.getListFormatter({ type: "unit" }).format(group.children)})`
          );
        }
      };

      for ( const [key, data] of Object.entries(CONFIG.DND5E.languages) ) {
        if ( data.children ) Object.entries(data.children).forEach(([k, d]) => processCategory(k, d));
        else processCategory(key, data);
      }
    }

    labels.languages.push(...splitSemicolons(languages.custom));

    for ( const [key, { label }] of Object.entries(CONFIG.DND5E.communicationTypes) ) {
      const data = languages.communication?.[key];
      if ( !data?.value ) continue;
      labels.ranged.push(`${label} ${formatDistance(data.value, data.units)}`);
    }
  }

  /* -------------------------------------------- */

  /**
   * Modify resistances and immunities for the petrified condition.
   * @this {CharacterData|NPCData}
   */
  static prepareResistImmune() {
    if ( this.parent.hasConditionEffect("petrification") ) {
      this.traits.dr.custom = game.i18n.localize("DND5E.DamageAll");
      Object.keys(CONFIG.DND5E.damageTypes).forEach(type => this.traits.dr.value.add(type));
      this.traits.dr.bypasses.clear();
      this.traits.di.value.add("poison");
      this.traits.ci.value.add("poisoned");
      this.traits.ci.value.add("diseased");
    }
  }
}
