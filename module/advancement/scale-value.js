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
          scale: {}
        }
      },
      order: 60,
      icon: "icons/svg/dice-target.svg",
      title: game.i18n.localize("DND5E.AdvancementScaleValueTitle"),
      hint: game.i18n.localize("DND5E.AdvancementScaleValueHint"),
      multiLevel: true,
      validItemTypes: new Set(["class", "sublass"]),
      apps: {
        config: ScaleValueConfig,
        flow: ScaleValueFlow
      }
    });
  }

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
  titleForLevel(level) {
    const value = this.valueForLevel(level);
    if ( !value ) return this.title;
    return `${this.title}: <strong>${value}</strong>`;
  }

  /* -------------------------------------------- */

  /**
   * Scale value for the given level.
   * @param {number} level  Level for which to get the scale value.
   * @returns {string}      Scale value at the given level or an empty string.
   */
  valueForLevel(level) {
    const key = Object.keys(this.data.configuration.scale).reverse().find(l => Number(l) <= level);
    return this.data.configuration.scale[key] ?? "";
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
      width: 540,
      submitOnChange: true
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    const data = super.getData();
    data.classIdentifier = this.item.identifier;
    data.previewIdentifier = this.data.configuration.identifier || this.data.title?.slugify()
      || game.i18n.localize(this.advancement.constructor.defaultTitle).slugify();

    let lastValue = "";
    data.levels = Array.fromRange(CONFIG.DND5E.maxLevel + 1).slice(1).reduce((obj, level) => {
      obj[level] = { placeholder: lastValue, value: "" };
      const value = this.data.configuration.scale[level];
      if ( value ) {
        obj[level].value = value;
        lastValue = value;
      }
      return obj;
    }, {});

    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareConfigurationUpdate(event, configuration) {
    // Ensure multiple values in a row are not the same
    if ( event.type === "submit" ) {
      let lastValue = "";
      for ( const [lvl, value] of Object.entries(configuration.scale) ) {
        if ( value === lastValue ) configuration.scale[lvl] = "";
        else if ( value ) lastValue = value;
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
    const slug = (event.target.value || game.i18n.localize(this.advancement.constructor.defaultTitle)).slugify();
    this.form.querySelector("input[name='data.configuration.identifier']").placeholder = slug;
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
      initial: this.advancement.valueForLevel(this.level - 1),
      final: this.advancement.valueForLevel(this.level)
    });
  }

}
