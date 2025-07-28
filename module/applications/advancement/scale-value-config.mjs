import AdvancementConfig from "./advancement-config-v2.mjs";
import { TYPES } from "../../data/advancement/scale-value.mjs";

/**
 * Configuration application for scale values.
 */
export default class ScaleValueConfig extends AdvancementConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["scale-value"],
    position: {
      width: 540
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    config: {
      container: { classes: ["column-container"], id: "column-left" },
      template: "systems/dnd5e/templates/advancement/advancement-controls-section.hbs"
    },
    details: {
      container: { classes: ["column-container"], id: "column-left" },
      template: "systems/dnd5e/templates/advancement/scale-value-config-details.hbs"
    },
    levels: {
      container: { classes: ["column-container"], id: "column-right" },
      template: "systems/dnd5e/templates/advancement/scale-value-config-levels.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const config = this.advancement.configuration;
    const type = TYPES[config.type];

    context.distanceOptions = Object.entries(CONFIG.DND5E.movementUnits)
      .map(([value, { label }]) => ({ value, label }));
    context.identifier = {
      placeholder: config.identifier || this.advancement.title?.slugify()
        || this.advancement.constructor.metadata.title.slugify()
    };
    context.identifier.hint = game.i18n.format(type.metadata.identifier, {
      class: this.item.identifier, identifier: context.identifier.placeholder
    });
    context.levels = this._prepareLevelData();
    context.type = {
      ...type.metadata,
      fields: type.schema.fields,
      options: Object.entries(TYPES).map(([value, d]) => ({ value, label: game.i18n.localize(d.metadata.label )}))
    };

    return context;
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
      const value = this.advancement.configuration.scale[level]?.clone();
      obj[level] = {
        fields: TYPES[this.advancement.configuration.type].getFields(level, value, lastValue),
        value: null
      };
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
  /*  Event Listeners and Handlers                */
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
  /*  Form Handling                               */
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
  async _processSubmitData(event, submitData) {
    const typeChange = foundry.utils.hasProperty(submitData, "configuration.type");
    if ( typeChange && (submitData.configuration.type !== this.advancement.configuration.type) ) {
      // Clear existing scale value data to prevent error during type update
      await this.advancement.update(Array.fromRange(CONFIG.DND5E.maxLevel, 1).reduce((obj, lvl) => {
        obj[`configuration.scale.-=${lvl}`] = null;
        return obj;
      }, {}));
      submitData.configuration.scale ??= {};
      const OriginalType = TYPES[this.advancement.configuration.type];
      const NewType = TYPES[submitData.configuration.type];
      for ( const [lvl, data] of Object.entries(submitData.configuration.scale) ) {
        const original = new OriginalType(data, { parent: this.advancement, strict: false });
        submitData.configuration.scale[lvl] = NewType.convertFrom(original)?.toObject();
      }
    }
    return super._processSubmitData(event, submitData);
  }

  /* -------------------------------------------- */

  /** @override */
  static _cleanedObject(object) {
    return Object.entries(object).reduce((obj, [key, value]) => {
      if ( Object.keys(value ?? {}).some(k => value[k]) ) obj[key] = value;
      else obj[`-=${key}`] = null;
      return obj;
    }, {});
  }
}
