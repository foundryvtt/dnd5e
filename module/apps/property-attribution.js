/**
 * Interface for viewing what factors went into determining a specific property.
 *
 * @extends {DocumentSheet}
 */
export default class PropertyAttribution extends Application {

  /**
   * @param {object[]} attributionData  Array of attribution entries.
   */
  constructor(attributionData, options={}) {
    super(options);
    this.attributionData = attributionData;
  }

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "property-attribution",
      classes: ["dnd5e", "property-attribution"],
      template: "systems/dnd5e/templates/apps/property-attribution.html",
      width: 320,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  async getData() {
    return {
      sources: this.attributionData
    }
  }

}
