import Advancement from "../advancement.mjs";
import AdvancementConfig from "../advancement-config.mjs";
import AdvancementFlow from "../advancement-flow.mjs";

import * as dataModels from "../../data/advancement/scale-value.mjs";

/**
 * Advancement that represents a value that scales with class level. **Can only be added to classes or subclasses.**
 */
export class ScaleValueAdvancement extends Advancement {

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: dataModels.ScaleValueConfigurationData
      },
      order: 60,
      icon: "systems/dnd5e/icons/svg/scale-value.svg",
      title: game.i18n.localize("DND5E.AdvancementScaleValueTitle"),
      hint: game.i18n.localize("DND5E.AdvancementScaleValueHint"),
      multiLevel: true,
      validItemTypes: new Set(["class", "subclass"]),
      apps: {
        config: ScaleValueConfig,
        flow: ScaleValueFlow
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * The available types of scaling value.
   * @enum {*}
   */
  static TYPES = {
    string: dataModels.ScaleValueTypeBase,
    number: dataModels.ScaleValueTypeNumber,
    cr: dataModels.ScaleValueTypeCR,
    dice: dataModels.ScaleValueTypeDice,
    distance: dataModels.ScaleValueTypeDistance
  };

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return Array.from(Object.keys(this.configuration.scale).map(l => Number(l)));
  }

  /* -------------------------------------------- */

  /**
   * Identifier for this scale value, either manual value or the slugified title.
   * @type {string}
   */
  get identifier() {
    return this.configuration.identifier || this.title.slugify();
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  titleForLevel(level, { configMode=false }={}) {
    const value = this.formatValue(level);
    if ( !value ) return this.title;
    return `${this.title}: <strong>${value}</strong>`;
  }

  /* -------------------------------------------- */

  /**
   * Scale value for the given level.
   * @param {number} level      Level for which to get the scale value.
   * @returns {ScaleValueType}  Scale value at the given level or null if none exists.
   */
  valueForLevel(level) {
    const key = Object.keys(this.configuration.scale).reverse().find(l => Number(l) <= level);
    const data = this.configuration.scale[key];
    const TypeClass = this.constructor.TYPES[this.configuration.type];
    if ( !data || !TypeClass ) return null;
    return new TypeClass(data, { parent: this });
  }

  /* -------------------------------------------- */

  /**
   * Compare two scaling values and determine if they are equal.
   * @param {*} a
   * @param {*} b
   * @returns {boolean}
   */
  testEquality(a, b) {
    const keys = Object.keys(a ?? {});
    if ( keys.length !== Object.keys(b ?? {}).length ) return false;
    for ( const k of keys ) {
      if ( a[k] !== b[k] ) return false;
    }
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Prepare a scale value for use in actor data.
   * @param {number} level  Level for which to get the scale value.
   * @returns {string|null}
   */
  prepareValue(level) {
    return this.valueForLevel(level)?.prepared ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Format a scale value for display.
   * @param {number} level  Level for which to get the scale value.
   * @returns {string|null}
   */
  formatValue(level) {
    return this.valueForLevel(level)?.formatted ?? null;
  }

}


/**
 * Configuration application for scale values.
 */
export class ScaleValueConfig extends AdvancementConfig {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "scale-value", "two-column"],
      template: "systems/dnd5e/templates/advancement/scale-value-config.hbs",
      width: 540
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    const config = this.advancement.configuration;
    const type = ScaleValueAdvancement.TYPES[config.type];
    return foundry.utils.mergeObject(super.getData(), {
      classIdentifier: this.item.identifier,
      previewIdentifier: config.identifier || this.advancement.title?.slugify()
        || this.advancement.constructor.metadata.title.slugify(),
      typeHint: game.i18n.localize(type.metadata.hint),
      types: Object.fromEntries(
        Object.entries(ScaleValueAdvancement.TYPES).map(([key, d]) => [key, game.i18n.localize(d.metadata.label)])
      ),
      faces: Object.fromEntries([2, 3, 4, 6, 8, 10, 12, 20].map(die => [die, `d${die}`])),
      levels: this._prepareLevelData(),
      isNumeric: type.metadata.isNumeric,
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
    return Array.fromRange(CONFIG.DND5E.maxLevel + 1).slice(1).reduce((obj, level) => {
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
      return { n: placeholder?.n ?? "", die: placeholder?.die ? `d${placeholder.die}` : "" };
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

  /** @inheritdoc */
  static _cleanedObject(object) {
    return Object.entries(object).reduce((obj, [key, value]) => {
      if ( Object.keys(value ?? {}).some(k => value[k]) ) obj[key] = value;
      else obj[`-=${key}`] = null;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
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

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    this.form.querySelector("input[name='title']").addEventListener("input", this._onChangeTitle.bind(this));
    this.form.querySelector(".identifier-hint-copy").addEventListener("click", this._onIdentifierHintCopy.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Copies the full scale identifier hint to the clipboard.
   * @param {Event} event  The triggering click event.
   * @protected
   */
  _onIdentifierHintCopy(event) {
    const data = this.getData();
    game.clipboard.copyPlainText(`@scale.${data.classIdentifier}.${data.previewIdentifier}`);
    game.tooltip.activate(event.target, {text: game.i18n.localize("DND5E.IdentifierCopied"), direction: "UP"});
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

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const typeChange = "configuration.type" in formData;
    if ( typeChange && (formData["configuration.type"] !== this.advancement.configuration.type) ) {
      for ( const key in formData ) { // Clear scale values if we're changing type.
        if ( key.startsWith("configuration.scale.") ) delete formData[key];
      }
      for ( const l of Array.fromRange(CONFIG.DND5E.maxLevel, 1) ) {
        formData[`configuration.scale.${l}`] = null;
      }
    }
    return super._updateObject(event, formData);
  }
}


/**
 * Inline application that displays any changes to a scale value.
 */
export class ScaleValueFlow extends AdvancementFlow {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/scale-value-flow.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      initial: this.advancement.formatValue(this.level - 1),
      final: this.advancement.formatValue(this.level)
    });
  }

}
