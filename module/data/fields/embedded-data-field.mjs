/**
 * Version of embedded data field that properly initializes data models added via active effects.
 * TODO: Remove when we can fully rely on https://github.com/foundryvtt/foundryvtt/issues/12528
 */
export default class EmbeddedDataField5e extends foundry.data.fields.EmbeddedDataField {
  /** @override */
  _castChangeDelta(delta) {
    if ( delta instanceof this.model ) return delta;
    return this.initialize(this._cast(delta));
  }
}
