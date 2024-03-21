import { FormulaField } from "../../fields.mjs";
import MovementField from "../../shared/movement-field.mjs";
import SensesField from "../../shared/senses-field.mjs";
import ActiveEffect5e from "../../../documents/active-effect.mjs";
import RollConfigField from "../../shared/roll-config-field.mjs";
import { simplifyBonus } from "../../../utils.mjs";

/**
 * Shared contents of the attributes schema between various actor types.
 */
export default class AttributesFields {
  /**
   * Fields shared between characters, NPCs, and vehicles.
   *
   * @type {object}
   * @property {object} init
   * @property {string} init.ability     The ability used for initiative rolls.
   * @property {string} init.bonus       The bonus provided to initiative rolls.
   * @property {object} movement
   * @property {number} movement.burrow  Actor burrowing speed.
   * @property {number} movement.climb   Actor climbing speed.
   * @property {number} movement.fly     Actor flying speed.
   * @property {number} movement.swim    Actor swimming speed.
   * @property {number} movement.walk    Actor walking speed.
   * @property {string} movement.units   Movement used to measure the various speeds.
   * @property {boolean} movement.hover  Is this flying creature able to hover in place.
   */
  static get common() {
    return {
      init: new RollConfigField({
        ability: "",
        bonus: new FormulaField({required: true, label: "DND5E.InitiativeBonus"})
      }, { label: "DND5E.Initiative" }),
      movement: new MovementField()
    };
  }

  /* -------------------------------------------- */

  /**
   * Fields shared between characters and NPCs.
   *
   * @type {object}
   * @property {object} attunement
   * @property {number} attunement.max          Maximum number of attuned items.
   * @property {object} senses
   * @property {number} senses.darkvision       Creature's darkvision range.
   * @property {number} senses.blindsight       Creature's blindsight range.
   * @property {number} senses.tremorsense      Creature's tremorsense range.
   * @property {number} senses.truesight        Creature's truesight range.
   * @property {string} senses.units            Distance units used to measure senses.
   * @property {string} senses.special          Description of any special senses or restrictions.
   * @property {string} spellcasting            Primary spellcasting ability.
   * @property {number} exhaustion              Creature's exhaustion level.
   * @property {object} concentration
   * @property {string} concentration.ability   The ability used for concentration saving throws.
   * @property {string} concentration.bonus     The bonus provided to concentration saving throws.
   * @property {number} concentration.limit     The amount of items this actor can concentrate on.
   * @property {object} concentration.roll
   * @property {number} concentration.roll.min  The minimum the d20 can roll.
   * @property {number} concentration.roll.max  The maximum the d20 can roll.
   * @property {number} concentration.roll.mode The default advantage mode for this actor's concentration saving throws.
   */
  static get creature() {
    return {
      attunement: new foundry.data.fields.SchemaField({
        max: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 3, label: "DND5E.AttunementMax"
        })
      }, {label: "DND5E.Attunement"}),
      senses: new SensesField(),
      spellcasting: new foundry.data.fields.StringField({
        required: true, blank: true, initial: "int", label: "DND5E.SpellAbility"
      }),
      exhaustion: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.Exhaustion"
      }),
      concentration: new RollConfigField({
        ability: "",
        bonuses: new foundry.data.fields.SchemaField({
          save: new FormulaField({required: true, label: "DND5E.SaveBonus"})
        }),
        limit: new foundry.data.fields.NumberField({integer: true, min: 0, initial: 1, label: "DND5E.AttrConcentration.Limit"})
      }, {label: "DND5E.Concentration"})
    };
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /**
   * Migrate the old init.value and incorporate it into init.bonus.
   * @param {object} source  The source attributes object.
   * @internal
   */
  static _migrateInitiative(source) {
    const init = source?.init;
    if ( !init?.value || (typeof init?.bonus === "string") ) return;
    if ( init.bonus ) init.bonus += init.value < 0 ? ` - ${init.value * -1}` : ` + ${init.value}`;
    else init.bonus = `${init.value}`;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Initialize derived AC fields for Active Effects to target.
   * @this {CharacterData|NPCData|VehicleData}
   */
  static prepareBaseArmorClass() {
    const ac = this.attributes.ac;
    ac.armor = 10;
    ac.shield = ac.cover = 0;
    ac.bonus = "";
  }

  /* -------------------------------------------- */

  /**
   * Adjust exhaustion level based on Active Effects.
   * @this {CharacterData|NPCData}
   */
  static prepareExhaustionLevel() {
    const exhaustion = this.parent.effects.get(ActiveEffect5e.ID.EXHAUSTION);
    const level = exhaustion?.getFlag("dnd5e", "exhaustionLevel");
    this.attributes.exhaustion = Number.isFinite(level) ? level : 0;
  }

  /* -------------------------------------------- */

  /**
   * Prepare concentration data for an Actor.
   * @this {CharacterData|NPCData}
   * @param {object} rollData  The Actor's roll data.
   */
  static prepareConcentration(rollData) {
    const { concentration } = this.attributes;
    const abilityId = concentration.ability;
    const ability = this.abilities?.[abilityId] || {};
    const bonus = simplifyBonus(concentration.bonuses.save, rollData);
    concentration.save = (ability.save ?? 0) + bonus;
  }

  /* -------------------------------------------- */

  /**
   * Calculate maximum hit points, taking an provided advancement into consideration.
   * @param {object} hp                 HP object to calculate.
   * @param {object} [options={}]
   * @param {HitPointsAdvancement[]} [options.advancement=[]]  Advancement items from which to get hit points per-level.
   * @param {number} [options.bonus=0]  Additional bonus to add atop the calculated value.
   * @param {number} [options.mod=0]    Modifier for the ability to add to hit points from advancement.
   * @this {ActorDataModel}
   */
  static prepareHitPoints(hp, { advancement=[], mod=0, bonus=0 }={}) {
    const base = advancement.reduce((total, advancement) => total + advancement.getAdjustedTotal(mod), 0);
    hp.max = (hp.max ?? 0) + base + bonus;
    if ( this.parent.hasConditionEffect("halfHealth") ) hp.max = Math.floor(hp.max * 0.5);

    hp.effectiveMax = hp.max + (hp.tempmax ?? 0);
    hp.value = Math.min(hp.value, hp.effectiveMax);
    hp.damage = hp.effectiveMax - hp.value;
    hp.pct = Math.clamped(hp.effectiveMax ? (hp.value / hp.effectiveMax) * 100 : 0, 0, 100);
  }

  /* -------------------------------------------- */

  /**
   * Modify movement speeds taking exhaustion and any other conditions into account.
   * @this {CharacterData|NPCData}
   */
  static prepareMovement() {
    const statuses = this.parent.statuses;
    const noMovement = this.parent.hasConditionEffect("noMovement");
    const halfMovement = this.parent.hasConditionEffect("halfMovement");
    const encumbered = statuses.has("encumbered");
    const heavilyEncumbered = statuses.has("heavilyEncumbered");
    const exceedingCarryingCapacity = statuses.has("exceedingCarryingCapacity");
    const crawl = this.parent.hasConditionEffect("crawl");
    const units = this.attributes.movement.units;
    for ( const type in CONFIG.DND5E.movementTypes ) {
      let speed = this.attributes.movement[type];
      if ( noMovement || (crawl && (type !== "walk")) ) speed = 0;
      else {
        if ( halfMovement ) speed *= 0.5;
        if ( heavilyEncumbered ) {
          speed = Math.max(0, speed - (CONFIG.DND5E.encumbrance.speedReduction.heavilyEncumbered[units] ?? 0));
        } else if ( encumbered ) {
          speed = Math.max(0, speed - (CONFIG.DND5E.encumbrance.speedReduction.encumbered[units] ?? 0));
        }
        if ( exceedingCarryingCapacity ) {
          speed = Math.min(speed, CONFIG.DND5E.encumbrance.speedReduction.exceedingCarryingCapacity[units] ?? 0);
        }
      }
      this.attributes.movement[type] = speed;
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply movement and sense changes based on a race item. This method should be called during
   * the `prepareEmbeddedData` step of data preparation.
   * @param {Item5e} race                    Race item from which to get the stats.
   * @param {object} [options={}]
   * @param {boolean} [options.force=false]  Override any values on the actor.
   * @this {CharacterData|NPCData}
   */
  static prepareRace(race, { force=false }={}) {
    for ( const key of Object.keys(CONFIG.DND5E.movementTypes) ) {
      if ( !race.system.movement[key] || (!force && (this.attributes.movement[key] !== null)) ) continue;
      this.attributes.movement[key] = race.system.movement[key];
    }
    if ( race.system.movement.hover ) this.attributes.movement.hover = true;
    if ( force && race.system.movement.units ) this.attributes.movement.units = race.system.movement.units;
    else this.attributes.movement.units ??= race.system.movement.units ?? Object.keys(CONFIG.DND5E.movementUnits)[0];

    for ( const key of Object.keys(CONFIG.DND5E.senses) ) {
      if ( !race.system.senses[key] || (!force && (this.attributes.senses[key] !== null)) ) continue;
      this.attributes.senses[key] = race.system.senses[key];
    }
    this.attributes.senses.special = [this.attributes.senses.special, race.system.senses.special].filterJoin(";");
    if ( force && race.system.senses.units ) this.attributes.senses.units = race.system.senses.units;
    else this.attributes.senses.units ??= race.system.senses.units ?? Object.keys(CONFIG.DND5E.movementUnits)[0];
  }
}
