import SystemDataModel from "../../abstract.mjs";
import { MappingField } from "../../fields.mjs";
import CurrencyTemplate from "../../shared/currency.mjs";
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
export default class CommonTemplate extends SystemDataModel.mixin(CurrencyTemplate) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      abilities: new MappingField(new foundry.data.fields.EmbeddedDataField(AbilityData), {
        initialKeys: CONFIG.DND5E.abilities
      }, {label: "DND5E.Abilities"})
    });
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
