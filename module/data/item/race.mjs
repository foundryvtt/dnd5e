import Actor5e from "../../documents/actor/actor.mjs";
import SystemDataModel from "../abstract.mjs";
import { AdvancementField, IdentifierField } from "../fields.mjs";
import { CreatureTypeField, MovementField, SensesField } from "../shared/_module.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

/**
 * Data definition for Race items.
 * @mixes ItemDescriptionTemplate
 *
 * @property {string} identifier       Identifier slug for this race.
 * @property {object[]} advancement    Advancement objects for this race.
 * @property {MovementField} movement
 * @property {SensesField} senses
 * @property {CreatureType} type
 */
export default class RaceData extends SystemDataModel.mixin(ItemDescriptionTemplate) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      identifier: new IdentifierField({label: "DND5E.Identifier"}),
      advancement: new foundry.data.fields.ArrayField(new AdvancementField(), {label: "DND5E.AdvancementTitle"}),
      movement: new MovementField(),
      senses: new SensesField(),
      type: new CreatureTypeField({ swarm: false })
    });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Sheet labels for a race's movement.
   * @returns {Object<string>}
   */
  get movementLabels() {
    const units = CONFIG.DND5E.movementUnits[this.movement.units];
    return Object.entries(CONFIG.DND5E.movementTypes).reduce((obj, [k, label]) => {
      const value = this.movement[k];
      if ( value ) obj[k] = `${label} ${value} ${units}`;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Sheet labels for a race's senses.
   * @returns {Object<string>}
   */
  get sensesLabels() {
    const units = CONFIG.DND5E.movementUnits[this.senses.units];
    return Object.entries(CONFIG.DND5E.senses).reduce((arr, [k, label]) => {
      const value = this.senses[k];
      if ( value ) arr.push(`${label} ${value} ${units}`);
      return arr;
    }, []).concat(this.senses.special.split(";").filter(l => l));
  }

  /* -------------------------------------------- */

  /**
   * Sheet label for a race's creature type.
   * @returns {Object<string>}
   */
  get typeLabel() {
    return Actor5e.formatCreatureType(this.type);
  }
}
