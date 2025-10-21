import { defaultUnits, formatLength, splitSemicolons } from "../../../utils.mjs";
import FormulaField from "../../fields/formula-field.mjs";
import MappingField from "../../fields/mapping-field.mjs";
import DamageTraitField from "../fields/damage-trait-field.mjs";
import SimpleTraitField from "../fields/simple-trait-field.mjs";

const { NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { TraitsCommonData, TraitsCreatureData } from "./_types.mjs";
 */

/**
 * Shared contents of the traits schema between various actor types.
 */
export default class TraitsField {
  /**
   * Fields shared between characters, NPCs, and vehicles.
   * @type {TraitsCommonData}
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
          label: "DND5E.DamagePhysicalBypass", hint: "DND5E.DAMAGE.PhysicalBypass.Hint"
        })
      }),
      ci: new SimpleTraitField({}, { label: "DND5E.ConImm" })
    };
  }

  /* -------------------------------------------- */

  /**
   * Fields shared between characters and NPCs.
   * @type {TraitsCreatureData}
   */
  static get creature() {
    return {
      languages: new SimpleTraitField({
        communication: new MappingField(new SchemaField({
          units: new StringField({ initial: () => defaultUnits("length") }),
          value: new NumberField({ required: true, min: 0 })
        }))
      }, { label: "DND5E.Languages" })
    };
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
        else if ( data.children && (data.selectable !== false) ) {
          const topLevel = group === undefined;
          group ??= { label: data.label, children: [] };
          Object.entries(data.children).forEach(([k, d]) => processCategory(k, d, group));
          if ( topLevel && group.children.length ) labels.languages.push(
            `${data.label} (${game.i18n.getListFormatter({ type: "unit" }).format(group.children)})`
          );
        }

        // Display children alone if category isn't selectable
        else if ( data.children ) Object.entries(data.children).forEach(([k, d]) => processCategory(k, d));
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
      labels.ranged.push(`${label} ${formatLength(data.value, data.units)}`);
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare condition immunities & petrified condition and handle "All Damage" value.
   * @this {CharacterData|NPCData|VehicleData}
   */
  static prepareResistImmune() {
    // Apply condition immunities
    for ( const condition of this.traits.ci.value ) this.parent.statuses.delete(condition);

    // Apply petrified condition
    if ( this.parent.hasConditionEffect("petrification") ) {
      this.traits.dr.value.add("ALL");
      this.traits.dr.bypasses.clear();
      this.traits.di.value.add("poison");
      this.traits.ci.value.add("poisoned");
      this.traits.ci.value.add("diseased");
    }

    // Clear other damage resistances/immunities/vulnerabilities if All is set
    for ( const key of ["dr", "di", "dv"] ) {
      const entry = this.traits[key];
      if ( entry.value.has("ALL") ) {
        entry.value.clear();
        entry.value.add("ALL");
        if ( key === "di" ) this.traits.dr.value.clear();
      }
      else if ( key === "di" ) entry.value.forEach(k => this.traits.dr.value.delete(k));
    }
  }
}
