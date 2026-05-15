import Application5e from "./api/application.mjs";

/**
 * @import { PropertyAttributionDescription } from "./_types.mjs";
 */

/**
 * Interface for viewing what factors went into determining a specific property.
 *
 * @param {Document} object                                The Document that owns the property being attributed.
 * @param {PropertyAttributionDescription[]} attributions  An array of all the attribution data.
 * @param {string} property                                Dot separated path to the property.
 * @param {object} [options={}]                            Application rendering options.
 */
export default class PropertyAttribution extends Application5e {
  constructor(object, attributions, property, options={}) {
    super(options);
    this.object = object;
    this.attributions = attributions;
    this.property = property;
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["property-attribution"],
    window: {
      frame: false,
      positioned: false
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    attribution: {
      template: "systems/dnd5e/templates/apps/property-attribution.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Prepare tooltip contents.
   * @returns {Promise<string>}
   */
  async renderTooltip() {
    await this.render({ force: true });
    return this.element.innerHTML;
  }

  /* -------------------------------------------- */

  /** @override */
  _insertElement(element) {}

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const property = foundry.utils.getProperty(this.object.system, this.property);
    let total;
    if ( Number.isNumeric(property)) total = property;
    else if ( typeof property === "object" && Number.isNumeric(property.value) ) total = property.value;
    const sources = foundry.utils.duplicate(this.attributions);
    for ( const source of sources ) {
      if ( source.mode === undefined ) continue;
      source.type = { 0: "custom", 1: "multiply", 2: "add", 3: "downgrade", 4: "upgrade", 5: "override" }[source.mode];
      foundry.utils.logCompatibilityWarning(
        "Property attribution now accepts `type` rather than `mode` to match active effect changes.",
        { since: "DnD5e 6.0", until: "DnD5e 6.2" }
      );
    }
    return {
      caption: game.i18n.localize(this.options.title),
      sources: sources.map(entry => {
        if ( entry.label.startsWith("@") ) entry.label = this.getPropertyLabel(entry.label.slice(1));
        if ( (entry.type === "add") && (entry.value < 0) ) {
          entry.negative = true;
          entry.value = entry.value * -1;
        }
        return entry;
      }),
      total: total
    };
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Produce a human-readable and localized name for the provided property.
   * @param {string} property  Dot separated path to the property.
   * @returns {string}         Property name for display.
   */
  getPropertyLabel(property) {
    const parts = property.split(".");
    if ( parts[0] === "abilities" && parts[1] ) {
      return CONFIG.DND5E.abilities[parts[1]]?.label ?? property;
    } else if ( (property === "attributes.ac.dex") && CONFIG.DND5E.abilities.dex ) {
      return CONFIG.DND5E.abilities.dex.label;
    } else if ( (parts[0] === "prof") || (property === "attributes.prof") ) {
      return game.i18n.localize("DND5E.Proficiency");
    }
    return property;
  }
}
