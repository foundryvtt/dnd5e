import { FormulaField } from "../../fields.mjs";
import MovementField from "../../shared/movement-field.mjs";
import SensesField from "../../shared/senses-field.mjs";
import ActiveEffect5e from "../../../documents/active-effect.mjs";

/**
 * Shared contents of the attributes schema between various actor types.
 */
export default class AttributesFields {
  /**
   * Fields shared between characters, NPCs, and vehicles.
   *
   * @type {object}
   * @property {object} init
   * @property {number} init.value       Calculated initiative modifier.
   * @property {number} init.bonus       Fixed bonus provided to initiative rolls.
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
      init: new foundry.data.fields.SchemaField({
        ability: new foundry.data.fields.StringField({label: "DND5E.AbilityModifier"}),
        bonus: new FormulaField({label: "DND5E.InitiativeBonus"})
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
   * @property {number} attunement.max      Maximum number of attuned items.
   * @property {object} senses
   * @property {number} senses.darkvision   Creature's darkvision range.
   * @property {number} senses.blindsight   Creature's blindsight range.
   * @property {number} senses.tremorsense  Creature's tremorsense range.
   * @property {number} senses.truesight    Creature's truesight range.
   * @property {string} senses.units        Distance units used to measure senses.
   * @property {string} senses.special      Description of any special senses or restrictions.
   * @property {string} spellcasting        Primary spellcasting ability.
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
      })
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
   * Modify movement speeds taking exhaustion and any other conditions into account.
   * @this {CharacterData|NPCData}
   */
  static prepareMovement() {
    const statuses = this.parent.statuses;
    const noMovement = this.parent.hasCondition("noMovement") || (this.attributes.exhaustion >= 5);
    const halfMovement = this.parent.hasCondition("halfMovement") || (this.attributes.exhaustion >= 2);
    const reduction = statuses.has("heavilyEncumbered")
      ? CONFIG.DND5E.encumbrance.speedReduction.heavilyEncumbered
      : statuses.has("encumbered") ? CONFIG.DND5E.encumbrance.speedReduction.encumbered : 0;
    const crawl = this.parent.hasCondition("crawl");
    Object.keys(CONFIG.DND5E.movementTypes).forEach(k => {
      if ( reduction ) this.attributes.movement[k] = Math.max(0, this.attributes.movement[k] - reduction);
      if ( (crawl && (k !== "walk")) || noMovement ) this.attributes.movement[k] = 0;
      else if ( statuses.has("exceedingCarryingCapacity") ) this.attributes.movement[k] = 5;
      else if ( halfMovement ) this.attributes.movement[k] = Math.floor(this.attributes.movement[k] * 0.5);
    });
  }
}
