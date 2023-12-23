import { FormulaField } from "../../fields.mjs";
import MovementField from "../../shared/movement-field.mjs";
import SensesField from "../../shared/senses-field.mjs";

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
   * Modify movement speeds taking exhaustion and any other conditions into account.
   */
  static prepareMovement() {
    const noMovement = new Set(["grappled", "paralyzed", "petrified", "restrained", "stunned", "unconscious"])
      .intersection(this.parent.statuses).size || (this.attributes.exhaustion >= 5);
    const halfMovement = this.parent.statuses.has("prone") || (this.attributes.exhaustion >= 2);
    if ( !noMovement && !halfMovement ) return;
    Object.keys(CONFIG.DND5E.movementTypes).forEach(k => {
      if ( (this.parent.statuses.has("prone") && (k !== "walk")) || noMovement ) this.attributes.movement[k] = 0;
      else this.attributes.movement[k] = Math.floor(this.attributes.movement[k] * 0.5);
    });
  }
}
