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

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      order: 10,
      icon: "icons/magic/life/heart-pink.webp",
      typeIcon: "systems/dnd5e/icons/svg/hit-points.svg",
      title: game.i18n.localize("DND5E.ADVANCEMENT.HitPoints.Title"),
      hint: game.i18n.localize("DND5E.ADVANCEMENT.HitPoints.Hint"),
      multiLevel: true,
      apps: {
        config: HitPointsConfig,
        flow: HitPointsFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /**
   * The amount gained if the average is taken.
   * @type {number}
   */
  get average() {
    return (this.hitDieValue / 2) + 1;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get levels() {
    return Array.fromRange(CONFIG.DND5E.maxLevel + 1).slice(1);
  }

  /* -------------------------------------------- */

  /**
   * Shortcut to the hit die used by the class.
   * @returns {string}
   */
  get hitDie() {
    if ( this.actor?.type === "npc" ) return `d${this.actor.system.attributes.hd.denomination}`;
    return this.item.system.hd.denomination;
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

  /** @inheritDoc */
  configuredForLevel(level) {
    return this.valueForLevel(level) !== null;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  titleForLevel(level, { configMode=false, legacyDisplay=false }={}) {
    const hp = this.valueForLevel(level);
    if ( !hp || configMode || !legacyDisplay ) return this.title;
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

  /**
   * Total hit points taking the provided ability modifier into account, with a minimum of 1 per level.
   * @param {number} mod  Modifier to add per level.
   * @returns {number}    Total hit points plus modifier.
   */
  getAdjustedTotal(mod) {
    return Object.keys(this.value).reduce((total, level) => {
      return total + Math.max(this.valueForLevel(parseInt(level)) + mod, 1);
    }, 0);
  }

  /* -------------------------------------------- */
  /*  Editing Methods                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static availableForItem(item) {
    return !item.advancement.byType.HitPoints?.length;
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /**
   * Add the ability modifier and any bonuses to the provided hit points value to get the number to apply.
   * @param {number} value  Hit points taken at a given level.
   * @returns {number}      Hit points adjusted with ability modifier and per-level bonuses.
   */
  #getApplicableValue(value) {
    const abilityId = CONFIG.DND5E.defaultAbilities.hitPoints || "con";
    value = Math.max(value + (this.actor.system.abilities[abilityId]?.mod ?? 0), 1);
    value += simplifyBonus(this.actor.system.attributes.hp.bonuses?.level, this.actor.getRollData());
    return value;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  apply(level, data) {
    let value = this.constructor.valueForLevel(data, this.hitDieValue, level);
    if ( value === undefined ) return;
    this.actor.updateSource({
      "system.attributes.hp.value": this.actor.system.attributes.hp.value + this.#getApplicableValue(value)
    });
    this.updateSource({ value: data });
  }

  /* -------------------------------------------- */

  /** @override */
  automaticApplicationValue(level) {
    if ( (level === 1) && this.item.isOriginalClass ) return { [level]: "max" };
    if ( this.value[level - 1] === "avg" ) return { [level]: "avg" };
    return false;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  restore(level, data) {
    this.apply(level, data);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  reverse(level) {
    let value = this.valueForLevel(level);
    if ( value === undefined ) return;
    this.actor.updateSource({
      "system.attributes.hp.value": this.actor.system.attributes.hp.value - this.#getApplicableValue(value)
    });
    const source = { [level]: this.value[level] };
    this.updateSource({ [`value.-=${level}`]: null });
    return source;
  }
}
