/**
 * Description for a single part of a property attribution.
 * @typedef {object} AttributionDescription
 * @property {string} label  Descriptive label that will be displayed. If the label is in the form
 *                           of an @ property, the system will try to turn it into a human-readable label.
 * @property {number} mode   Application mode for this step as defined in
 *                           [CONST.ACTIVE_EFFECT_MODES](https://foundryvtt.com/api/module-constants.html#.ACTIVE_EFFECT_MODES).
 * @property {number} value  Value of this step.
 */

/**
 * Interface for viewing what factors went into determining a specific property.
 *
 * @param {Document} object                        The Document that owns the property being attributed.
 * @param {AttributionDescription[]} attributions  An array of all the attribution data.
 * @param {string} property                        Dot separated path to the property.
 * @param {object} [options={}]                    Application rendering options.
 */
export default class PropertyAttribution extends Application {
  constructor(object, attributions, property, options={}) {
    super(options);
    this.object = object;
    this.attributions = attributions;
    this.property = property;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "property-attribution",
      classes: ["dnd5e", "property-attribution"],
      template: "systems/dnd5e/templates/apps/property-attribution.hbs",
      width: 320,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /**
   * Render this view as a tooltip rather than a whole window.
   * @param {HTMLElement} element  The element to which the tooltip should be attached.
   */
  async renderTooltip(element) {
    const data = this.getData(this.options);
    const text = (await this._renderInner(data))[0].outerHTML;
    game.tooltip.activate(element, { text, cssClass: "property-attribution" });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData() {
    const property = foundry.utils.getProperty(this.object.system, this.property);
    let total;
    if ( Number.isNumeric(property)) total = property;
    else if ( typeof property === "object" && Number.isNumeric(property.value) ) total = property.value;
    const sources = foundry.utils.duplicate(this.attributions);
    return {
      caption: this.options.title,
      sources: sources.map(entry => {
        if ( entry.label.startsWith("@") ) entry.label = this.getPropertyLabel(entry.label.slice(1));
        if ( (entry.mode === CONST.ACTIVE_EFFECT_MODES.ADD) && (entry.value < 0) ) {
          entry.negative = true;
          entry.value = entry.value * -1;
        }
        return entry;
      }),
      total: total
    };
  }

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
    } else if ( property === "attributes.ac.abilityMod" ) {
      const ability = this.object.armor?.system.armor?.ability;
      return CONFIG.DND5E.abilities[ability]?.label ?? game.i18n.localize("DND5E.ItemEquipmentAbilityMod");
    } else if ( (parts[0] === "prof") || (property === "attributes.prof") ) {
      return game.i18n.localize("DND5E.Proficiency");
    }
    return property;
  }
}
