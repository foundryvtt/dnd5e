import SystemDataModel from "../abstract.mjs";
import { AdvancementField, IdentifierField } from "../fields.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

/**
 * Data definition for Race items.
 * @mixes ItemDescriptionTemplate
 *
 * @property {string} identifier       Identifier slug for this race.
 * @property {object[]} advancement    Advancement objects for this race.
 * @property {number} darkvision       Darkvision distance.
 * @property {object} movement
 * @property {number} movement.burrow
 * @property {number} movement.climb
 * @property {number} movement.fly
 * @property {number} movement.swim
 * @property {number} movement.walk
 * @property {string} movement.units   Units used to measure movement.
 * @property {object} type
 * @property {string} type.value       Creature type (e.g. "humanoid", "construct").
 * @property {string} type.subtype     Additional type data (e.g. "elf" for Eladrin)
 */
export default class RaceData extends SystemDataModel.mixin(ItemDescriptionTemplate) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      identifier: new IdentifierField({label: "DND5E.Identifier"}),
      advancement: new foundry.data.fields.ArrayField(new AdvancementField(), {label: "DND5E.AdvancementTitle"}),
      darkvision: new foundry.data.fields.NumberField({min: 0, integer: true, label: "DND5E.SenseDarkvision"}),
      movement: new foundry.data.fields.SchemaField({
        burrow: new foundry.data.fields.NumberField({
          initial: null, min: 0, integer: true, label: "DND5E.MovementBurrow"
        }),
        climb: new foundry.data.fields.NumberField({
          initial: null, min: 0, integer: true, label: "DND5E.MovementClimb"
        }),
        fly: new foundry.data.fields.NumberField({
          initial: null, min: 0, integer: true, label: "DND5E.MovementFly"
        }),
        swim: new foundry.data.fields.NumberField({
          initial: null, min: 0, integer: true, label: "DND5E.MovementSwim"
        }),
        walk: new foundry.data.fields.NumberField({
          initial: 30, min: 0, integer: true, label: "DND5E.MovementWalk"
        }),
        units: new foundry.data.fields.StringField({initial: "ft", label: "DND5E.MovementUnits"})
      }),
      type: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.StringField({initial: "humanoid", label: "DND5E.CreatureType"}),
        subtype: new foundry.data.fields.StringField({label: "DND5E.CreatureTypeSelectorSubtype"})
      })
    });
  }

  /* -------------------------------------------- */

  prepareDerivedData() {
    const labels = this.parent.labels ??= {};

    // Prepare type label
    labels.type = game.i18n.localize(CONFIG.DND5E.creatureTypes[this.type.value]);
    if ( this.type.subtype ) labels.type += ` (${this.type.subtype})`;

    // Prepare movement labels
    labels.movement ??= {};
    const units = CONFIG.DND5E.movementUnits[this.movement.units];
    for ( const [key, label] of Object.entries(CONFIG.DND5E.movementTypes) ) {
      const value = this.movement[key];
      if ( !value ) continue;
      labels.movement[key] = `${label} ${value} ${units}`;
    }
  }
}
