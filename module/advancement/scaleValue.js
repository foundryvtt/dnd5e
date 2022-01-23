import { Advancement } from "./advancement.js";
import { AdvancementConfig } from "./advancementConfig.js";


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
      title: "DND5E.AdvancementTitle",
      width: 540
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    const data = super.getData();
    data.classIdentifier = this.parent.identifier;

    let lastValue = "";
    data.levels = this.advancement.constructor.allLevels.reduce((obj, level) => {
      obj[level] = { placeholder: lastValue, value: "" };
      const value = data.data.configuration.scale[level];
      if ( value && (value !== lastValue) ) {
        obj[level].value = value;
        lastValue = value;
      }
      return obj;
    }, {});

    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareConfigurationUpdate(configuration) {
    configuration.scale = this.constructor._cleanedObject(configuration.scale);
    return configuration;
  }

}


/**
 * Advancement that represents a value that scales with class level. **Can only be added to classes or subclasses.**
 *
 * @extends {Advancement}
 */
export class ScaleValueAdvancement extends Advancement {

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultConfiguration = {
    identifier: "",
    scale: {}
  };

  /* -------------------------------------------- */

  /** @inheritdoc */
  static order = 60;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultTitle = "DND5E.AdvancementScaleValueTitle";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultIcon = "icons/svg/dice-target.svg";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static hint = "DND5E.AdvancementScaleValueHint";

  /* -------------------------------------------- */

  static configApp = ScaleValueConfig;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static multiLevel = true;

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return Array.from(Object.keys(this.data.configuration.scale));
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

  /**
   * Scale value for the given level.
   * @param {number} level  Level for which to get the scale value.
   * @returns {string}      Scale value at the given level or an empty string.
   */
  valueForLevel(level) {
    const key = Object.keys(this.data.configuration.scale).reverse().find(l => Number(l) <= level);
    return this.data.configuration.scale[key] ?? "";
  }

  /* -------------------------------------------- */
  /*  Editing Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static availableForItem(item) {
    return item.type === "class";
  }

}
