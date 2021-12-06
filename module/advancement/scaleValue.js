import { Advancement } from "./advancement.js";

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
  static order = 30;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultTitle = "DND5E.AdvancementScaleValueTitle";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultIcon = "icons/svg/dice-target.svg";

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
    const key = Object.keys(this.data.configuration.scale).reverse().find(l => l <= level);
    return this.data.configuration.scale[key] ?? "";
  }

}
