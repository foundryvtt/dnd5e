import Advancement from "./advancement.mjs";
import HitPointsConfig from "../../applications/advancement/hit-points-config.mjs";
import HitPointsFlow from "../../applications/advancement/hit-points-flow.mjs";
import { simplifyBonus } from "../../utils.mjs";

/**
 * Advancement that presents the player with the option to roll hit points at each level or select the average value.
 * Keeps track of player hit point rolls or selection for each class level. **Can only be added to classes and each
 * class can only have one.**
 */
export default class HitPointsAdvancement extends Advancement {

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      order: 10,
      icon: "systems/dnd5e/icons/svg/hit-points.svg",
      title: game.i18n.localize("DND5E.AdvancementHitPointsTitle"),
      hint: game.i18n.localize("DND5E.AdvancementHitPointsHint"),
      multiLevel: true,
      validItemTypes: new Set(["class"]),
      apps: {
        config: HitPointsConfig,
        flow: HitPointsFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return Array.fromRange(CONFIG.DND5E.maxLevel + 1).slice(1);
  }

  /* -------------------------------------------- */

  /**
   * Shortcut to the hit die used by the class.
   * @returns {string}
   */
  get hitDie() {
    return this.item.system.hitDice;
  }

  /* -------------------------------------------- */

  /**
   * The face value of the hit die used.
   * @returns {number}
   */
  get hitDieValue() {
    return Number(this.hitDie.substring(1));
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  configuredForLevel(level) {
    return this.valueForLevel(level) !== null;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  titleForLevel(level, { configMode=false }={}) {
    const hp = this.valueForLevel(level);
    if ( !hp || configMode ) return this.title;
    return `${this.title}: <strong>${hp}</strong>`;
  }

  /* -------------------------------------------- */

  /**
   * Hit points given at the provided level.
   * @param {number} level   Level for which to get hit points.
   * @returns {number|null}  Hit points for level or null if none have been taken.
   */
  valueForLevel(level) {
    return this.constructor.valueForLevel(this.value, this.hitDieValue, level);
  }

  /* -------------------------------------------- */

  /**
   * Hit points given at the provided level.
   * @param {object} data         Contents of `value` used to determine this value.
   * @param {number} hitDieValue  Face value of the hit die used by this advancement.
   * @param {number} level        Level for which to get hit points.
   * @returns {number|null}       Hit points for level or null if none have been taken.
   */
  static valueForLevel(data, hitDieValue, level) {
    const value = data[level];
    if ( !value ) return null;

    if ( value === "max" ) return hitDieValue;
    if ( value === "avg" ) return (hitDieValue / 2) + 1;
    return value;
  }

  /* -------------------------------------------- */

  /**
   * Total hit points provided by this advancement.
   * @returns {number}  Hit points currently selected.
   */
  total() {
    return Object.keys(this.value).reduce((total, level) => total + this.valueForLevel(parseInt(level)), 0);
  }

  /* -------------------------------------------- */
  /*  Editing Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static availableForItem(item) {
    return !item.advancement.byType.HitPoints?.length;
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  apply(level, data) {
    let value = this.constructor.valueForLevel(data, this.hitDieValue, level);
    if ( value === undefined ) return;

    value += this.actor.system.abilities.con?.mod ?? 0;
    value += simplifyBonus(this.actor.system.attributes.hp.bonuses.level, this.actor.getRollData());
    this.actor.updateSource({"system.attributes.hp.value": this.actor.system.attributes.hp.value + value});
    this.updateSource({ value: data });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  restore(level, data) {
    this.apply(level, data);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  reverse(level) {
    let value = this.valueForLevel(level);
    if ( value === undefined ) return;

    value += this.actor.system.abilities.con?.mod ?? 0;
    value += simplifyBonus(this.actor.system.attributes.hp.bonuses.level, this.actor.getRollData());
    this.actor.updateSource({"system.attributes.hp.value": this.actor.system.attributes.hp.value - value});
    const source = { [level]: this.value[level] };
    this.updateSource({ [`value.-=${level}`]: null });
    return source;
  }
}
