import { Advancement } from "./advancement.js";
import { AdvancementConfig } from "./advancement-config.js";
import { AdvancementFlow } from "./advancement-flow.js";


/**
 * Advancement that represents a value that scales with class level. **Can only be added to classes or subclasses.**
 *
 * @extends {Advancement}
 */
export class ScaleValueAdvancement extends Advancement {

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      defaults: {
        configuration: {
          identifier: "",
          type: "string",
          distance: {units: ""},
          scale: {}
        }
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
   * @enum {object}
   */
  static TYPES = {
    string: "DND5E.AdvancementScaleValueTypeString",
    number: "DND5E.AdvancementScaleValueTypeNumber",
    dice: "DND5E.AdvancementScaleValueTypeDice",
    distance: "DND5E.AdvancementScaleValueTypeDistance"
  };

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return Array.from(Object.keys(this.data.configuration.scale).map(l => Number(l)));
  }

  /* -------------------------------------------- */

  /**
   * Identifier for this scale value, either manual value or the slugified title.
   * @type {string}
   */
  get identifier() {
    return this.data.configuration.identifier || this.title.slugify();
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
   * @param {number} level  Level for which to get the scale value.
   * @returns {*}           Scale value at the given level or null if none exists.
   */
  valueForLevel(level) {
    const key = Object.keys(this.data.configuration.scale).reverse().find(l => Number(l) <= level);
    return this.data.configuration.scale[key] ?? null;
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
    const value = this.valueForLevel(level);
    if ( value == null ) return null;
    if ( this.data.configuration.type === "dice" ) return `${value.n ?? ""}d${value.die}`;
    return `${value.value}`;
  }

  /* -------------------------------------------- */

  /**
   * Format a scale value for display.
   * @param {number} level  Level for which to get the scale value.
   * @returns {string|null}
   */
  formatValue(level) {
    if ( this.data.configuration.type !== "distance" ) return this.prepareValue(level);
    const value = this.valueForLevel(level);
    if ( value == null ) return null;
    return `${value.value} ${CONFIG.DND5E.movementUnits[this.data.configuration.distance.units]}`;
  }

}


/**
 * Configuration application for scale values.
 *
 * @extends {AdvancementConfig}
 */
export class ScaleValueConfig extends AdvancementConfig {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "scale-value", "two-column"],
      template: "systems/dnd5e/templates/advancement/scale-value-config.html",
      width: 540
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    const data = super.getData();
    const config = this.advancement.data.configuration;
    data.classIdentifier = this.item.identifier;
    data.previewIdentifier = config.identifier || this.advancement.data.title?.slugify()
      || this.advancement.constructor.metadata.title.slugify();
    data.typeHint = game.i18n.localize(`DND5E.AdvancementScaleValueTypeHint${config.type.capitalize()}`);
    data.types =
      Object.fromEntries(
        Object.entries(ScaleValueAdvancement.TYPES).map(([key, label]) => [key, game.i18n.localize(label)]));
    data.faces = Object.fromEntries([2, 3, 4, 6, 8, 10, 12, 20].map(die => [die, `d${die}`]));
    data.levels = this._prepareLevelData();
    data.isNumeric = ["number", "distance"].includes(config.type);
    data.movementUnits = CONFIG.DND5E.movementUnits;
    return data;
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
      const value = this.advancement.data.configuration.scale[level];
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
    if ( this.advancement.data.configuration.type === "dice" ) {
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
    this.form.querySelector("input[name='data.title']").addEventListener("input", this._onChangeTitle.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * If no identifier is manually entered, slugify the custom title and display as placeholder.
   * @param {Event} event  Change event to the title input.
   */
  _onChangeTitle(event) {
    const slug = (event.target.value || this.advancement.constructor.metadata.title).slugify();
    this.form.querySelector("input[name='data.configuration.identifier']").placeholder = slug;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const typeChange = "data.configuration.type" in formData;
    if ( typeChange && (formData["data.configuration.type"] !== this.advancement.data.configuration.type) ) {
      // Clear scale values if we're changing type.
      for ( const key in formData ) {
        if ( key.startsWith("data.configuration.scale.") ) delete formData[key];
      }
      Array.fromRange(CONFIG.DND5E.maxLevel + 1).slice(1).forEach(l =>
        formData[`data.configuration.scale.${l}`] = null);
    }
    return super._updateObject(event, formData);
  }

}


/**
 * Inline application that displays any changes to a scale value.
 *
 * @extends {AdvancementFlow}
 */
export class ScaleValueFlow extends AdvancementFlow {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/scale-value-flow.html"
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
