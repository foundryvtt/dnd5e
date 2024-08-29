import AdvancementConfig from "./advancement-config.mjs";
import { TYPES } from "../../data/advancement/scale-value.mjs";

/**
 * Configuration application for scale values.
 */
export default class ScaleValueConfig extends AdvancementConfig {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "scale-value", "two-column"],
      template: "systems/dnd5e/templates/advancement/scale-value-config.hbs",
      width: 540
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData() {
    const config = this.advancement.configuration;
    const type = TYPES[config.type];
    return foundry.utils.mergeObject(super.getData(), {
      classIdentifier: this.item.identifier,
      previewIdentifier: config.identifier || this.advancement.title?.slugify()
        || this.advancement.constructor.metadata.title.slugify(),
      type: type.metadata,
      types: Object.fromEntries(
        Object.entries(TYPES).map(([key, d]) => [key, game.i18n.localize(d.metadata.label)])
      ),
      faces: Object.fromEntries(TYPES.dice.FACES.map(die => [die, `d${die}`])),
      levels: this._prepareLevelData(),
      movementUnits: CONFIG.DND5E.movementUnits
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare the data to display at each of the scale levels.
   * @returns {object}
   * @protected
   */
  _prepareLevelData() {
    let lastValue = null;
    let levels = Array.fromRange(CONFIG.DND5E.maxLevel + 1);
    if ( ["class", "subclass"].includes(this.advancement.item.type) ) levels = levels.slice(1);
    return levels.reduce((obj, level) => {
      obj[level] = { placeholder: this._formatPlaceholder(lastValue), value: null };
      const value = this.advancement.configuration.scale[level];
      if ( value ) {
        this._mergeScaleValues(value, lastValue);
        obj[level].className = "new-scale-value";
        obj[level].value = value;
        lastValue = value;
      }
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Formats the placeholder for this scale value.
   * @param {*} placeholder
   * @returns {object}
   * @protected
   */
  _formatPlaceholder(placeholder) {
    if ( this.advancement.configuration.type === "dice" ) {
      return { number: placeholder?.number ?? "", faces: placeholder?.faces ? `d${placeholder.faces}` : "" };
    }
    return { value: placeholder?.value ?? "" };
  }

  /* -------------------------------------------- */

  /**
   * For scale values with multiple properties, have missing properties inherit from earlier filled-in values.
   * @param {*} value      The primary value.
   * @param {*} lastValue  The previous value.
   */
  _mergeScaleValues(value, lastValue) {
    for ( const k of Object.keys(lastValue ?? {}) ) {
      if ( value[k] == null ) value[k] = lastValue[k];
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static _cleanedObject(object) {
    return Object.entries(object).reduce((obj, [key, value]) => {
      if ( Object.keys(value ?? {}).some(k => value[k]) ) obj[key] = value;
      else obj[`-=${key}`] = null;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareConfigurationUpdate(configuration) {
    // Ensure multiple values in a row are not the same
    let lastValue = null;
    for ( const [lvl, value] of Object.entries(configuration.scale) ) {
      if ( this.advancement.testEquality(lastValue, value) ) configuration.scale[lvl] = null;
      else if ( Object.keys(value ?? {}).some(k => value[k]) ) {
        this._mergeScaleValues(value, lastValue);
        lastValue = value;
      }
    }
    configuration.scale = this.constructor._cleanedObject(configuration.scale);
    return configuration;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    this.form.querySelector("input[name='title']").addEventListener("input", this._onChangeTitle.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * If no identifier is manually entered, slugify the custom title and display as placeholder.
   * @param {Event} event  Change event to the title input.
   */
  _onChangeTitle(event) {
    const slug = (event.target.value || this.advancement.constructor.metadata.title).slugify();
    this.form.querySelector("input[name='configuration.identifier']").placeholder = slug;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    const updates = foundry.utils.expandObject(formData);
    const typeChange = "configuration.type" in formData;
    if ( typeChange && (updates.configuration.type !== this.advancement.configuration.type) ) {
      // Clear existing scale value data to prevent error during type update
      await this.advancement.update(Array.fromRange(CONFIG.DND5E.maxLevel, 1).reduce((obj, lvl) => {
        obj[`configuration.scale.-=${lvl}`] = null;
        return obj;
      }, {}));
      updates.configuration.scale ??= {};
      const OriginalType = TYPES[this.advancement.configuration.type];
      const NewType = TYPES[updates.configuration.type];
      for ( const [lvl, data] of Object.entries(updates.configuration.scale) ) {
        const original = new OriginalType(data, { parent: this.advancement });
        updates.configuration.scale[lvl] = NewType.convertFrom(original)?.toObject();
      }
    }
    return super._updateObject(event, foundry.utils.flattenObject(updates));
  }
}
