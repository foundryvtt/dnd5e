/**
 * Interface for viewing what factors went into determining a specific property.
 *
 * @extends {DocumentSheet}
 */
export default class PropertyAttribution extends Application {

  /**
   * @param {Document} object - Object containing the property to be attributed.
   * @param {object} object._propertyAttributions - Object containing all of the attribution data.
   * @param {string} property - Dot separated path to the property.
   */
  constructor(object, property, options={}) {
    super(options);
    this.object = object;
    this.property = property;
  }

  /* -------------------------------------------- */

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
    const property = foundry.utils.getProperty(this.object.data.data, this.property)
    let total;
    if ( Number.isNumeric(property)) {
      total = property;
    } else if ( typeof property === "object" && Number.isNumeric(property.value) ) {
      total = property.value;
    }

    const sources = foundry.utils.duplicate(this.object._propertyAttributions[this.property]);
    return {
      sources: sources.map((entry) => {
        if ( entry.label.startsWith("@") ) {
          entry.label = this.getPropertyLabel(entry.label.slice(1));
        }
        if ( (entry.mode === CONST.ACTIVE_EFFECT_MODES.ADD) && (entry.value < 0) ) {
          entry.negative = true;
          entry.value = entry.value * -1;
        }
        return entry;
      }),
      total: total
    }
  }

  /* -------------------------------------------- */

  getPropertyLabel(property) {
    const parts = property.split(".");
    if ( parts[0] === "abilities" && parts[1] ) {
      return CONFIG.DND5E.abilities[parts[1]];
    }
    return property;
  }

}
