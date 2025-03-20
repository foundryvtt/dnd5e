import Advancement from "./advancement.mjs";
import ScaleValueConfig from "../../applications/advancement/scale-value-config.mjs";
import ScaleValueFlow from "../../applications/advancement/scale-value-flow.mjs";
import { ScaleValueConfigurationData, TYPES } from "../../data/advancement/scale-value.mjs";

/**
 * Advancement that represents a value that scales with class level. **Can only be added to classes or subclasses.**
 */
export default class ScaleValueAdvancement extends Advancement {

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: ScaleValueConfigurationData
      },
      order: 60,
      icon: "icons/sundries/gaming/dice-pair-white-green.webp",
      typeIcon: "systems/dnd5e/icons/svg/scale-value.svg",
      title: game.i18n.localize("DND5E.ADVANCEMENT.ScaleValue.Title"),
      hint: game.i18n.localize("DND5E.ADVANCEMENT.ScaleValue.Hint"),
      multiLevel: true,
      apps: {
        config: ScaleValueConfig,
        flow: ScaleValueFlow
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * The available types of scaling value.
   * @enum {ScaleValueType}
   */
  static TYPES = TYPES;

  /* -------------------------------------------- */

  /** @inheritDoc */
  static localize() {
    super.localize();
    Object.values(TYPES).forEach(v => foundry.helpers.Localization.localizeDataModel(v));
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get levels() {
    return Array.from(Object.keys(this.configuration.scale).map(l => Number(l)))
      .filter(l => !["class", "subclass"].includes(this.item.type) ? true : l !== 0);
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

  /** @inheritDoc */
  titleForLevel(level, { configMode=false, legacyDisplay=false }={}) {
    const value = this.valueForLevel(level)?.display;
    if ( !value || !legacyDisplay ) return this.title;
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
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @override */
  automaticApplicationValue(level) {
    return {};
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc*/
  getContextMenuOptions() {
    const options = super.getContextMenuOptions();
    options.push({
      name: "DND5E.ADVANCEMENT.ScaleValue.Action.CopyFormula",
      icon: '<i class="fa-solid fa-copy"></i>',
      callback: () => {
        const value = `@scale.${this.item.identifier}.${this.identifier}`;
        game.clipboard.copyPlainText(value);
        ui.notifications.info(game.i18n.format("DND5E.Copied", { value }), { console: false });
      },
      group: "copy"
    });
    return options;
  }
}
