import { MappingField } from "../data/fields.mjs";
import { staticID } from "../utils.mjs";

/**
 * Extend the base TokenDocument class to implement system-specific HP bar logic.
 */
export default class TokenDocument5e extends TokenDocument {

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeSource(data, options={}) {
    // Migrate backpack -> container.
    for ( const item of data.delta?.items ?? [] ) {
      // This will be correctly flagged as needing a source migration when the synthetic actor is created, but we need
      // to also change the type in the raw ActorDelta to avoid spurious console warnings.
      if ( item.type === "backpack" ) item.type = "container";
    }
    return super._initializeSource(data, options);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

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
    const id = staticID(`dnd${effectData.id}`);

    // Remove existing effects that contain this effect data's primary ID as their primary ID.
    const existing = this.actor.effects.get(id);
    const state = active ?? !existing;
    if ( !state && existing ) await this.actor.deleteEmbeddedDocuments("ActiveEffect", [id]);

    // Add a new effect
    else if ( state ) {
      const cls = getDocumentClass("ActiveEffect");
      const createData = {
        ...foundry.utils.deepClone(effectData),
        _id: id,
        name: game.i18n.localize(effectData.name),
        statuses: [effectData.id, ...effectData.statuses ?? []]
      };
      cls.migrateDataSafe(createData);
      cls.cleanData(createData);
      if ( overlay ) createData["flags.core.overlay"] = true;
      await cls.create(createData, {parent: this.actor, keepId: true});
    }

    return state;
  }
}
