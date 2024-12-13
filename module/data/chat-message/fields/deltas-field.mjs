import MappingField from "../../fields/mapping-field.mjs";

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @typedef ActorDeltasData
 * @property {IndividualDeltaData[]} actor                 Changes for the actor.
 * @property {Record<string, IndividualDeltaData[]>} item  Changes for each item grouped by ID.
 */

/**
 * A field for storing deltas made to an actor or embedded items.
 */
export default class ActorDeltasField extends SchemaField {
  constructor() {
    super({
      actor: new ArrayField(new IndividualDeltaField()),
      item: new MappingField(new ArrayField(new IndividualDeltaField()))
    });
  }

  /* -------------------------------------------- */

  /**
   * Calculate delta information for an actor document from the given updates.
   * @param {Actor5e} actor                              Actor for which to calculate the deltas.
   * @param {{ actor: object, item: object[] }} updates  Updates to apply to the actor and contained items.
   * @returns {ActorDeltasData}
   */
  static getDeltas(actor, updates) {
    return {
      actor: IndividualDeltaField.getDeltas(actor, updates.actor),
      item: updates.item.reduce((obj, { _id, ...changes }) => {
        const deltas = IndividualDeltaField.getDeltas(actor.items.get(_id), changes);
        if ( deltas.length ) obj[_id] = deltas;
        return obj;
      }, {})
    };
  }
}

/**
 * @typedef IndividualDeltaData
 * @property {number} delta    The change in the specified field.
 * @property {string} keyPath  Path to the changed field on the document.
 */

/**
 * A field that stores a delta for an individual property on an actor or item.
 */
export class IndividualDeltaField extends SchemaField {
  constructor() {
    super({ delta: new NumberField(), keyPath: new StringField() });
  }

  /* -------------------------------------------- */

  /**
   * Calculate delta information for a document from the given updates.
   * @param {DataModel} dataModel      Document for which to calculate the deltas.
   * @param {object} updates           Updates that are to be applied.
   * @returns {IndividualDeltaData[]}
   */
  static getDeltas(dataModel, updates) {
    updates = foundry.utils.flattenObject(updates);
    const deltas = [];
    for ( const [keyPath, value] of Object.entries(updates) ) {
      let currentValue;
      if ( keyPath.startsWith("system.activities") ) {
        const [id, ...kp] = keyPath.slice(18).split(".");
        currentValue = foundry.utils.getProperty(dataModel.system.activities?.get(id) ?? {}, kp.join("."));
      }
      else currentValue = foundry.utils.getProperty(dataModel, keyPath);

      const delta = value - currentValue;
      if ( delta && !Number.isNaN(delta) ) deltas.push({ keyPath, delta });
    }
    return deltas;
  }
}
