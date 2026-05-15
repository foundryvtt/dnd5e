import AdvancementConfig from "./advancement-config-v2.mjs";
import { TYPES } from "../../data/advancement/scale-value.mjs";
import { formatIdentifier } from "../../utils.mjs";

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
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Range of levels that can be used based on what item type this advancement is within.
   * @type {number[]}
   */
  get levelRange() {
    let levels = Array.fromRange(CONFIG.DND5E.maxLevel + 1);
    return ["class", "subclass"].includes(this.advancement.item.type) ? levels.slice(1) : levels;
  }

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
      placeholder: config.identifier
        || formatIdentifier(this.advancement.title || this.advancement.constructor.metadata.title)
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
    const TypeClass = TYPES[this.advancement.configuration.type];
    return this.levelRange.reduce((obj, level) => {
      const value = new TypeClass(this.advancement.configuration.scale[level] ?? {});
      const lastValue = this.advancement.valueForLevel(level - 1);
      obj[level] = {
        fields: TypeClass.getFields(level, value, lastValue),
        value: this.advancement.configuration.scale[level] ?? {}
      };
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
    const slug = formatIdentifier(event.target.value || this.advancement.constructor.metadata.title);
    this.form.querySelector("input[name='configuration.identifier']").placeholder = slug;
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareConfigurationUpdate(configuration) {
    const TypeClass = TYPES[configuration.type ?? this.advancement.configuration.type];
    const validKeys = Object.keys(TypeClass.schema.fields);

    let lastValue = {};
    const scale = {};
    for ( const level of this.levelRange ) {
      const value = configuration.scale[level] ?? {};
      scale[level] = {};

      // Fetch data for valid keys, skipping if value is empty or the same as a previous level
      for ( const key of validKeys ) {
        if ( !value[key] || (value[key] === lastValue[key]) ) scale[level][`-=${key}`] = null;
        else lastValue[key] = scale[level][key] = value[key];
        // TODO: Ensure value is valid
      }

      // Strip out any invalid keys
      for ( const key of Object.keys(this.advancement.configuration.scale[level] ?? {}) ) {
        if ( !validKeys.includes(key) ) scale[level][`-=${key}`] = null;
      }

      // If all updates were removals, just remove the level as a whole
      if ( Object.keys(scale[level]).every(k => k.startsWith("-=")) ) {
        delete scale[level];
        scale[`-=${level}`] = null;
      }
    }

    configuration.scale = scale;
    return configuration;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _processSubmitData(event, submitData) {
    const type = submitData.configuration.type;
    if ( type && (submitData.configuration.type !== this.advancement.configuration.type) ) {
      // Perform the update with the old type
      delete submitData.configuration.type;
      await super._processSubmitData(event, submitData);

      // Transform values into new type
      const NewType = TYPES[type];
      for ( const level of this.levelRange ) {
        const value = this.advancement.valueForLevel(level);
        if ( value ) submitData.configuration.scale[level] = NewType.convertFrom(value)?.toObject();
        else submitData.configuration.scale[`-=${level}`] = null;
      }

      submitData.configuration.type = type;
    }
    return super._processSubmitData(event, submitData);
  }
}
