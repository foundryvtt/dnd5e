const { SetField, StringField } = foundry.data.fields;

/**
 * @typedef {Set<string>} ActivationsData
 */

/**
 * A field for storing relative UUIDs to activations on the actor.
 */
export default class ActivationsField extends SetField {
  constructor() {
    super(new StringField());
  }

  /* -------------------------------------------- */

  /**
   * Find any activity relative UUIDs on this actor that can be used during a set of periods.
   * @param {Actor5e} actor
   * @param {string[]} periods
   * @returns {string[]}
   */
  static getActivations(actor, periods) {
    return actor.items
      .map(i => i.system.activities?.filter(a => periods.includes(a.activation?.type)).map(a => a.relativeUUID) ?? [])
      .flat();
  }

  /* -------------------------------------------- */

  /**
   * Prepare activations for display on chat card.
   * @this {ActivationsData}
   * @param {Actor5e} actor  Actor to which this activations can be used.
   * @returns {Activity[]}
   */
  static processActivations(actor) {
    return Array.from(this)
      .map(uuid => fromUuidSync(uuid, { relative: actor, strict: false }))
      .filter(_ => _)
      .sort((lhs, rhs) => (lhs.item.sort - rhs.item.sort) || (lhs.sort - rhs.sort));
  }
}
