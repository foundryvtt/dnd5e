/**
 * Data field that selects the appropriate advancement data model if available, otherwise defaults to generic
 * `ObjectField` to prevent issues with custom advancement types that aren't currently loaded.
 */
export default class AdvancementField extends foundry.data.fields.ObjectField {

  /**
   * Get the BaseAdvancement definition for the specified advancement type.
   * @param {string} type                    The Advancement type.
   * @returns {typeof BaseAdvancement|null}  The BaseAdvancement class, or null.
   */
  getModelForType(type) {
    return CONFIG.DND5E.advancementTypes[type]?.documentClass ?? null;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _cleanType(value, options) {
    if ( !(typeof value === "object") ) value = {};

    const cls = this.getModelForType(value.type);
    if ( cls ) return cls.cleanData(value, options);
    return value;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  initialize(value, model, options={}) {
    const cls = this.getModelForType(value.type);
    if ( cls ) return new cls(value, {parent: model, ...options});
    return foundry.utils.deepClone(value);
  }

  /* -------------------------------------------- */

  /**
   * Migrate this field's candidate source data.
   * @param {object} sourceData   Candidate source data of the root model
   * @param {any} fieldData       The value of this field within the source data
   */
  migrateSource(sourceData, fieldData) {
    const cls = this.getModelForType(fieldData.type);
    if ( cls ) cls.migrateDataSafe(fieldData);
  }
}
