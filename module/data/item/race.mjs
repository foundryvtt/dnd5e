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
      type: new CreatureTypeField({ swarm: false }, { initial: { value: "humanoid" } })
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static metadata = Object.freeze({
    singleton: true
  });

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

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /**
   * Create default advancement items when race is created.
   * @param {object} data               The initial data object provided to the document creation request.
   * @param {object} options            Additional options which modify the creation request.
   * @param {User} user                 The User requesting the document creation.
   * @returns {Promise<boolean|void>}   A return value of false indicates the creation operation should be cancelled.
   * @see {Document#_preCreate}
   * @protected
   */
  async _preCreate(data, options, user) {
    if ( data._id || foundry.utils.hasProperty(data, "system.advancement") ) return;
    const toCreate = [
      { type: "AbilityScoreImprovement" }, { type: "Size" },
      { type: "Trait", configuration: { grants: ["languages:common"] } }
    ];
    this.parent.updateSource({"system.advancement": toCreate.map(c => {
      const AdvancementClass = CONFIG.DND5E.advancementTypes[c.type];
      return new AdvancementClass(c, { parent: this.parent }).toObject();
    })});
  }

  /* -------------------------------------------- */

  /**
   * Set the race reference in actor data.
   * @param {object} data     The initial data object provided to the document creation request
   * @param {object} options  Additional options which modify the creation request
   * @param {string} userId   The id of the User requesting the document update
   * @see {Document#_onCreate}
   * @protected
   */
  _onCreate(data, options, userId) {
    if ( (game.user.id !== userId) || this.parent.actor?.type !== "character" ) return;
    const updates = { "system.details.race": this.parent.id };
    const attributes = this.parent.actor.system.attributes;

    for ( const key of Object.keys(CONFIG.DND5E.movementTypes) ) {
      if ( this.movement[key] > attributes.movement[key] ) {
        updates[`system.attributes.movement.${key}`] = this.movement[key];
      }
    }
    if ( this.movement.hover ) updates["system.attributes.movement.hover"] = true;
    updates["system.attributes.movement.units"] = this.movement.units;

    for ( const key of Object.keys(CONFIG.DND5E.senses) ) {
      if ( this.senses[key] > attributes.senses[key] ) {
        updates[`system.attributes.senses.${key}`] = this.senses[key];
      }
    }
    if ( this.senses.special ) {
      updates[system.attributes.senses.special] = [attributes.senses.special, this.senses.special].filterJoin(";");
    }
    updates["system.attributes.senses.units"] = this.senses.units;

    if ( this.type.value ) updates["system.details.type.value"] = this.type.value;
    if ( this.type.subtype ) updates["system.details.type.subtype"] = this.type.subtype;
    if ( this.type.custom ) updates["system.details.type.custom"] = this.type.custom;

    this.parent.actor.update(updates);
  }

  /* -------------------------------------------- */

  /**
   * Remove the race reference in actor data.
   * @param {object} options            Additional options which modify the deletion request
   * @param {documents.BaseUser} user   The User requesting the document deletion
   * @returns {Promise<boolean|void>}   A return value of false indicates the deletion operation should be cancelled.
   * @see {Document#_preDelete}
   * @protected
   */
  async _preDelete(options, user) {
    if ( this.parent.actor?.type !== "character" ) return;
    const updates = { "system.details.race": null };
    const attributes = this.parent.actor.system.attributes;
    if ( options.shouldRemoveAdvancements === false ) return;

    for ( const key of Object.keys(CONFIG.DND5E.movementTypes) ) {
      if ( this.movement[key] === attributes.movement[key] ) {
        updates[`system.attributes.movement.${key}`] = 0;
      }
    }
    if ( this.movement.hover ) updates["system.attributes.movement.hover"] = false;

    for ( const key of Object.keys(CONFIG.DND5E.senses) ) {
      if ( this.senses[key] === attributes.senses[key] ) {
        updates[`system.attributes.senses.${key}`] = 0;
      }
    }
    if ( this.senses.special ) {
      updates[system.attributes.senses.special] = attributes.senses.special.replace(this.senses.special, "");
    }

    const type = this.parent.actor.system.details.type;
    if ( this.type.value === type.value ) updates["system.details.type.value"] = "humanoid";
    if ( this.type.subtype === type.subtype ) updates["system.details.type.subtype"] = "";
    if ( this.type.custom === type.custom ) updates["system.details.type.custom"] = "";

    await this.parent.actor.update(updates);
  }
}
