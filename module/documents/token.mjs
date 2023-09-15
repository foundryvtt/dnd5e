import { MappingField } from "../data/fields.mjs";

/**
 * Extend the base TokenDocument class to implement system-specific HP bar logic.
 */
export default class TokenDocument5e extends TokenDocument {

  /** @inheritdoc */
  getBarAttribute(...args) {
    const data = super.getBarAttribute(...args);
    if ( data && (data.attribute === "attributes.hp") ) {
      const hp = this.actor.system.attributes.hp || {};
      data.value += (hp.temp || 0);
      data.max = Math.max(0, data.max + (hp.tempmax || 0));
    }
    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static getTrackedAttributes(data, _path=[]) {
    if ( !game.dnd5e.isV10 ) return super.getTrackedAttributes(data, _path);
    if ( data instanceof foundry.abstract.DataModel ) return this._getTrackedAttributesFromSchema(data.schema, _path);
    const attributes = super.getTrackedAttributes(data, _path);
    if ( _path.length ) return attributes;
    const allowed = CONFIG.DND5E.trackableAttributes;
    attributes.value = attributes.value.filter(attrs => this._isAllowedAttribute(allowed, attrs));
    return attributes;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static _getTrackedAttributesFromSchema(schema, _path=[]) {
    const isSchema = field => field instanceof foundry.data.fields.SchemaField;
    const isModel = field => field instanceof foundry.data.fields.EmbeddedDataField;
    const attributes = {bar: [], value: []};
    for ( const [name, field] of Object.entries(schema.fields) ) {
      const p = _path.concat([name]);
      if ( field instanceof foundry.data.fields.NumberField ) attributes.value.push(p);
      if ( isSchema(field) || isModel(field) ) {
        const schema = isModel(field) ? field.model.schema : field;
        const isBar = schema.has("value") && schema.has("max");
        if ( isBar ) attributes.bar.push(p);
        else {
          const inner = this._getTrackedAttributesFromSchema(schema, p);
          attributes.bar.push(...inner.bar);
          attributes.value.push(...inner.value);
        }
      }
      if ( !(field instanceof MappingField) ) continue;
      if ( !field.initialKeys || foundry.utils.isEmpty(field.initialKeys) ) continue;
      if ( !isSchema(field.model) && !isModel(field.model) ) continue;
      const keys = Array.isArray(field.initialKeys) ? field.initialKeys : Object.keys(field.initialKeys);
      for ( const key of keys ) {
        const inner = this._getTrackedAttributesFromSchema(field.model, p.concat([key]));
        attributes.bar.push(...inner.bar);
        attributes.value.push(...inner.value);
      }
    }
    return attributes;
  }

  /* -------------------------------------------- */

  /**
   * Get an Array of attribute choices which are suitable for being consumed by an item usage.
   * @param {object} data  The actor data.
   * @returns {string[]}
   */
  static getConsumedAttributes(data) {
    return CONFIG.DND5E.consumableResources;
  }

  /* -------------------------------------------- */

  /**
   * Traverse the configured allowed attributes to see if the provided one matches.
   * @param {object} allowed  The allowed attributes structure.
   * @param {string[]} attrs  The attributes list to test.
   * @returns {boolean}       Whether the given attribute is allowed.
   * @private
   */
  static _isAllowedAttribute(allowed, attrs) {
    let allow = allowed;
    for ( const attr of attrs ) {
      if ( allow === undefined ) return false;
      if ( allow === true ) return true;
      if ( allow["*"] !== undefined ) allow = allow["*"];
      else allow = allow[attr];
    }
    return allow !== undefined;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async toggleActiveEffect(effectData, {overlay=false, active}={}) {
    if ( !this.actor || !effectData.id ) return false;

    // Remove existing effects that contain this effect data's primary id as their primary id.
    const existing = this.actor.effects.reduce((arr, e) => {
      if ( e.statuses.first() === effectData.id ) arr.push(e.id);
      return arr;
    }, []);
    const state = active ?? !existing.length;
    if ( !state && existing.length ) await this.actor.deleteEmbeddedDocuments("ActiveEffect", existing);

    // Add a new effect
    else if ( state ) {
      const cls = getDocumentClass("ActiveEffect");
      const createData = foundry.utils.deepClone(effectData);
      createData.statuses = [effectData.id, ...effectData.statuses ?? []];
      delete createData.id;
      cls.migrateDataSafe(createData);
      cls.cleanData(createData);
      createData.name = game.i18n.localize(createData.name);
      createData.description = game.i18n.localize(createData.description);
      if ( overlay ) createData["flags.core.overlay"] = true;
      await cls.create(createData, {parent: this.actor});
    }
    return state;
  }
}
