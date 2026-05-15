/**
 * Version of embedded data field that properly initializes data models added via active effects.
 */
export default class EmbeddedDataField5e extends foundry.data.fields.EmbeddedDataField {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "`EmbeddedDataField5e` has been deprecated and should be replaced with core's `EmbeddedDataField`.",
      { since: "DnD5e 6.0", until: "DnD5e 6.2" }
    );
    super(...args);
  }
}
