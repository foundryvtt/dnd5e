import SystemDataModel from "../../abstract.mjs";
import { FormulaField, makeSimpleTrait, MappingField } from "../../fields.mjs";
import CurrencyData from "../../shared/currency.mjs";
import AbilityData from "../ability.mjs";

/**
 * A template for all actors that share the common template.
 *
 * @property {Object<string, AbilityData>} abilities  Actor's abilities.
 * @property {object} attributes
 * @property {object} attributes.ac
 * @property {number} attributes.ac.flat          Flat value used for flat or natural armor calculation.
 * @property {string} attributes.ac.calc          Name of one of the built-in formulas to use.
 * @property {string} attributes.ac.formula       Custom formula to use.
 * @property {object} attributes.hp
 * @property {number} attributes.hp.value         Current hit points.
 * @property {number} attributes.hp.min           Minimum allowed HP value.
 * @property {number} attributes.hp.max           Maximum allowed HP value.
 * @property {number} attributes.hp.temp          Temporary HP applied on top of value.
 * @property {number} attributes.hp.tempmax       Temporary change to the maximum HP.
 * @property {object} attributes.init
 * @property {number} attributes.init.value       Calculated initiative modifier.
 * @property {number} attributes.init.bonus       Fixed bonus provided to initiative rolls.
 * @property {object} attributes.movement
 * @property {number} attributes.movement.burrow  Actor burrowing speed.
 * @property {number} attributes.movement.climb   Actor climbing speed.
 * @property {number} attributes.movement.fly     Actor flying speed.
 * @property {number} attributes.movement.swim    Actor swimming speed.
 * @property {number} attributes.movement.walk    Actor walking speed.
 * @property {string} attributes.movement.units   Movement used to measure the various speeds.
 * @property {boolean} attributes.movement.hover  Is this flying creature able to hover in place.
 * @property {object} details
 * @property {object} details.biography           Actor's biography data.
 * @property {string} details.biography.value     Full HTML biography information.
 * @property {string} details.biography.public    Biography that will be displayed to players with observer privileges.
 * @property {object} traits
 * @property {string} traits.size                 Actor's size.
 * @property {SimpleTraitData} traits.di          Damage immunities.
 * @property {SimpleTraitData} traits.dr          Damage resistances.
 * @property {SimpleTraitData} traits.dv          Damage vulnerabilities.
 * @property {SimpleTraitData} traits.ci          Condition immunities.
 * @property {CurrencyData} currency              Currency being held by this actor.
 * @mixin
 */
export default class CommonTemplate extends SystemDataModel {
  static defineSchema() {
    return {
      abilities: new MappingField(new foundry.data.fields.EmbeddedDataField(AbilityData), {
        initialKeys: CONFIG.DND5E.abilities
      }, {label: "DND5E.Abilities"}),
      attributes: new foundry.data.fields.SchemaField({
        ac: new foundry.data.fields.SchemaField({
          flat: new foundry.data.fields.NumberField({integer: true, min: 0, label: "DND5E.ArmorClassFlat"}),
          calc: new foundry.data.fields.StringField({initial: "default", label: "DND5E.ArmorClassCalculation"}),
          formula: new FormulaField({deterministic: true, label: "DND5E.ArmorClassFormula"})
        }),
        hp: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.NumberField({
            nullable: false, integer: true, min: 0, initial: 10, label: "DND5E.HitPointsCurrent"
          }),
          min: new foundry.data.fields.NumberField({
            nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.HitPointsMin"
          }),
          max: new foundry.data.fields.NumberField({
            nullable: false, integer: true, min: 0, initial: 10, label: "DND5E.HitPointsMax"
          }),
          temp: new foundry.data.fields.NumberField({integer: true, initial: 0, min: 0, label: "DND5E.HitPointsTemp"}),
          tempmax: new foundry.data.fields.NumberField({integer: true, initial: 0, label: "DND5E.HitPointsTempMax"})
        }, {
          label: "DND5E.HitPoints", validate: d => d.min <= d.max,
          validationError: "HP minimum must be less than HP maximum"
        }),
        init: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.NumberField({
            nullable: false, integer: true, initial: 0, label: "DND5E.Initiative"
          }),
          bonus: new foundry.data.fields.NumberField({
            nullable: false, integer: true, initial: 0, label: "DND5E.InitiativeBonus"
          })
        }, { label: "DND5E.Initiative" }),
        movement: new foundry.data.fields.SchemaField({
          burrow: new foundry.data.fields.NumberField({
            nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.MovementBurrow"
          }),
          climb: new foundry.data.fields.NumberField({
            nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.MovementClimb"
          }),
          fly: new foundry.data.fields.NumberField({
            nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.MovementFly"
          }),
          swim: new foundry.data.fields.NumberField({
            nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.MovementSwim"
          }),
          walk: new foundry.data.fields.NumberField({
            nullable: false, integer: true, min: 0, initial: 30, label: "DND5E.MovementWalk"
          }),
          units: new foundry.data.fields.StringField({initial: "ft", label: "DND5E.MovementUnits"}),
          hover: new foundry.data.fields.BooleanField({label: "DND5E.MovementHover"})
        }, {label: "DND5E.Movement"})
      }, {label: "DND5E.Attributes"}),
      details: new foundry.data.fields.SchemaField({
        biography: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.HTMLField({label: "DND5E.Biography"}),
          public: new foundry.data.fields.HTMLField({label: "DND5E.BiographyPublic"})
        }, {label: "DND5E.Biography"})
      }, {label: "DND5E.Details"}),
      traits: new foundry.data.fields.SchemaField({
        size: new foundry.data.fields.StringField({required: true, initial: "med", label: "DND5E.Size"}),
        di: makeSimpleTrait({label: "DND5E.DamImm"}), // TODO: Add "bypasses" here
        dr: makeSimpleTrait({label: "DND5E.DamRes"}), // TODO: Add "bypasses" here
        dv: makeSimpleTrait({label: "DND5E.DamVuln"}), // TODO: Add "bypasses" here
        ci: makeSimpleTrait({label: "DND5E.ConImm"})
      }, {label: "DND5E.Traits"}),
      currency: new foundry.data.fields.EmbeddedDataField(CurrencyData, {label: "DND5E.Currency"})
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    this.migrateACData(source);
    this.migrateMovementData(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the actor ac.value to new ac.flat override field.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateACData(source) {
    if ( !source.attributes?.ac ) return;
    const ac = source.attributes.ac;
  
    // If the actor has a numeric ac.value, then their AC has not been migrated to the auto-calculation schema yet.
    if ( Number.isNumeric(ac.value) ) {
      // TODO: Figure out how to determine if this is an NPC properly
      // const isNPC = this.defineSchema().hp.schema.formula !== undefined;
      const isNPC = false;
      ac.flat = parseInt(ac.value);
      ac.calc = isNPC ? "natural" : "flat";
      return;
    }
  
    // Migrate ac.base in custom formulas to ac.armor
    if ( (typeof ac.formula === "string") && ac.formula.includes("@attributes.ac.base") ) {
      ac.formula = ac.formula.replaceAll("@attributes.ac.base", "@attributes.ac.armor");
    }
  }

  /* -------------------------------------------- */

  /**
   * Migrate the actor speed string to movement object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateMovementData(source) {
    const original = source.attributes?.speed?.value ?? source.attributes?.speed;
    if ( (typeof original !== "string") || (source.attributes.movement?.walk !== undefined) ) return;
    source.attributes.movement ??= {};
    const s = original.split(" ");
    if ( s.length > 0 ) source.attributes.movement.walk = Number.isNumeric(s[0]) ? parseInt(s[0]) : 0;
  }
}
