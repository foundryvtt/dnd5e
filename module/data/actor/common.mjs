import { FormulaField, MappingField } from "../fields.mjs";
import CurrencyData from "../shared/currency.mjs";
import AbilityData from "./ability.mjs";

/**
 * Data definition for common data template.
 *
 * @property {Object<string, AbilityData>} abilities  Actor's ability scores.
 * @property {AttributeData} attributes               Armor class, hit points, movement, and initiative data.
 * @property {DetailsData} details                    Actor's biography.
 * @property {TraitsData} traits                      Actor's size, resistances, vulnerabilities, and immunities.
 * @property {CurrencyData} currency                  Currency being held by this actor.
 */
export class CommonData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      abilities: new MappingField(new foundry.data.fields.EmbeddedDataField(AbilityData), {
        initialKeys: CONFIG.DND5E.abilities, label: "DND5E.Abilities"
      }),
      attributes: new foundry.data.fields.EmbeddedDataField(AttributeData, {label: "DND5E.Attributes"}),
      details: new foundry.data.fields.EmbeddedDataField(DetailsData, {label: "DND5E.Details"}),
      traits: new foundry.data.fields.EmbeddedDataField(TraitsData, {label: "DND5E.Traits"}),
      currency: new foundry.data.fields.EmbeddedDataField(CurrencyData, {label: "DND5E.Currency"})
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    this.migrateSensesData(source);
    return super.migrateData(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the actor traits.senses string to attributes.senses object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateSensesData(source) {
    const original = source.traits?.senses;
    if ( (original === undefined) || (typeof original !== "string") ) return;
    source.attributes ??= {};
    source.attributes.senses ??= {};

    // Try to match old senses with the format like "Darkvision 60 ft, Blindsight 30 ft"
    const pattern = /([A-z]+)\s?([0-9]+)\s?([A-z]+)?/;
    let wasMatched = false;

    // Match each comma-separated term
    for ( let s of original.split(",") ) {
      s = s.trim();
      const match = s.match(pattern);
      if ( !match ) continue;
      const type = match[1].toLowerCase();
      if ( type in CONFIG.DND5E.senses ) {
        source.attributes.senses[type] = Number(match[2]).toNearest(0.5);
        wasMatched = true;
      }
    }

    // If nothing was matched, but there was an old string - put the whole thing in "special"
    if ( !wasMatched && original ) source.attributes.senses.special = original;
  }
}

/**
 * An embedded data structure for actor attributes.
 * @see CommonData
 *
 * @property {object} ac               Data used to calculate actor's armor class.
 * @property {number} ac.flat          Flat value used for flat or natural armor calculation.
 * @property {string} ac.calc          Name of one of the built-in formulas to use.
 * @property {string} ac.formula       Custom formula to use.
 * @property {object} hp               Actor's hit point data.
 * @property {number} hp.value         Current hit points.
 * @property {number} hp.min           Minimum allowed HP value.
 * @property {number} hp.max           Maximum allowed HP value.
 * @property {number} hp.temp          Temporary HP applied on top of value.
 * @property {number} hp.tempmax       Temporary change to the maximum HP.
 * @property {object} init             Actor's initiative modifier and bonuses.
 * @property {number} init.value       Calculated initiative modifier.
 * @property {number} init.bonus       Fixed bonus provided to initiative rolls.
 * @property {object} movement         Various actor movement speeds.
 * @property {number} movement.burrow  Actor burrowing speed.
 * @property {number} movement.climb   Actor climbing speed.
 * @property {number} movement.fly     Actor flying speed.
 * @property {number} movement.swim    Actor swimming speed.
 * @property {number} movement.walk    Actor walking speed.
 * @property {string} movement.units   Movement used to measure the various speeds.
 * @property {boolean} movement.hover  Is this flying creature able to hover in place.
 */
export class AttributeData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      ac: new foundry.data.fields.SchemaField({
        flat: new foundry.data.fields.NumberField({
          required: true, integer: true, min: 0, label: "DND5E.ArmorClassFlat"
        }),
        calc: new foundry.data.fields.StringField({
          required: true, initial: "default", label: "DND5E.ArmorClassCalculation"
        }),
        formula: new FormulaField({required: true, deterministic: true, label: "DND5E.ArmorClassFormula"})
      }, { label: "DND5E.ArmorClass" }),
      hp: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 10, label: "DND5E.HitPointsCurrent"
        }),
        min: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.HitPointsMin"
        }),
        max: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 10, label: "DND5E.HitPointsMax"
        }),
        temp: new foundry.data.fields.NumberField({
          required: true, integer: true, initial: 0, min: 0, label: "DND5E.HitPointsTemp"
        }),
        tempmax: new foundry.data.fields.NumberField({
          required: true, integer: true, initial: 0, label: "DND5E.HitPointsTempMax"
        })
      }, {
        label: "DND5E.HitPoints", validate: d => d.min <= d.max,
        validationError: "HP minimum must be less than HP maximum"
      }),
      init: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, initial: 0, label: "DND5E.Initiative"
        }),
        bonus: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, initial: 0, label: "DND5E.InitiativeBonus"
        })
      }, { label: "DND5E.Initiative" }),
      movement: new foundry.data.fields.SchemaField({
        burrow: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.MovementBurrow"
        }),
        climb: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.MovementClimb"
        }),
        fly: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.MovementFly"
        }),
        swim: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.MovementSwim"
        }),
        walk: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 30, label: "DND5E.MovementWalk"
        }),
        units: new foundry.data.fields.StringField({required: true, initial: "ft", label: "DND5E.MovementUnits"}),
        hover: new foundry.data.fields.BooleanField({label: "DND5E.MovementHover"})
      }, {label: "DND5E.Movement"})
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    this.migrateACData(source);
    this.migrateMovementData(source);
    return super.migrateData(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the actor ac.value to new ac.flat override field.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateACData(source) {
    if ( !source.ac ) return;

    // If the actor has a numeric ac.value, then their AC has not been migrated to the auto-calculation schema yet.
    if ( Number.isNumeric(source.ac.value) ) {
      const isNPC = this.defineSchema().hp.schema.formula !== undefined;
      source.ac.flat = parseInt(source.ac.value);
      source.ac.calc = isNPC ? "natural" : "flat";
      return;
    }

    // Migrate ac.base in custom formulas to ac.armor
    if ( (typeof source.ac.formula === "string") && source.ac.formula.includes("@attributes.ac.base") ) {
      source.ac.formula = source.ac.formula.replaceAll("@attributes.ac.base", "@attributes.ac.armor");
    }
  }

  /* -------------------------------------------- */

  /**
   * Migrate the actor speed string to movement object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateMovementData(source) {
    const original = source.speed?.value ?? source.speed;
    if ( (typeof original !== "string") || (source.movement?.walk !== undefined) ) return;
    source.movement ??= {};
    const s = original.split(" ");
    if ( s.length > 0 ) source.movement.walk = Number.isNumeric(s[0]) ? parseInt(s[0]) : 0;
  }

}

/**
 * An embedded data structure for actor details.
 * @see CommonData
 *
 * @property {object} biography         Actor's biography data.
 * @property {string} biography.value   Full HTML biography information.
 * @property {string} biography.public  Biography that will be displayed to players with only observer privileges.
 */
export class DetailsData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      biography: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({blank: true, label: "DND5E.Biography"}),
        public: new foundry.data.fields.HTMLField({blank: true, label: "DND5E.BiographyPublic"})
      }, {label: "DND5E.Biography"})
    };
  }
}

/**
 * An embedded data structure representing shared traits.
 * @see CommonData
 *
 * @property {string} size           Actor's size.
 * @property {object} di             Damage immunities.
 * @property {Set<string>} di.value  Currently selected damage immunities.
 * @property {string} di.custom      Semicolon-separated list of custom damage immunities.
 * @property {object} dr             Damage resistances.
 * @property {Set<string>} dr.value  Currently selected damage resistances.
 * @property {string} dr.custom      Semicolon-separated list of custom damage resistances.
 * @property {object} dv             Damage vulnerabilities.
 * @property {Set<string>} dv.value  Currently selected damage vulnerabilities.
 * @property {string} dv.custom      Semicolon-separated list of custom damage vulnerabilities.
 * @property {object} ci             Condition immunities.
 * @property {Set<string>} ci.value  Currently selected condition immunities.
 * @property {string} ci.custom      Semicolon-separated list of custom condition immunities.
 */
export class TraitsData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      size: new foundry.data.fields.StringField({required: true, initial: "med", label: "DND5E.Size"}),
      di: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.SetField(
          new foundry.data.fields.StringField({blank: false}), {label: "DND5E.TraitsChosen"}
        ),
        custom: new foundry.data.fields.StringField({required: true, label: "DND5E.Special"})
      }, {label: "DND5E.DamImm"}),
      dr: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.SetField(
          new foundry.data.fields.StringField({blank: false}), {label: "DND5E.TraitsChosen"}
        ),
        custom: new foundry.data.fields.StringField({required: true, label: "DND5E.Special"})
      }, {label: "DND5E.DamRes"}),
      dv: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.SetField(
          new foundry.data.fields.StringField({blank: false}), {label: "DND5E.TraitsChosen"}
        ),
        custom: new foundry.data.fields.StringField({required: true, label: "DND5E.Special"})
      }, {label: "DND5E.DamVuln"}),
      ci: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.SetField(
          new foundry.data.fields.StringField({blank: false}), {label: "DND5E.TraitsChosen"}
        ),
        custom: new foundry.data.fields.StringField({required: true, label: "DND5E.Special"})
      }, {label: "DND5E.ConImm"})
    };
  }
}
