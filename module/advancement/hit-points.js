import { Advancement } from "./advancement.js";
import { AdvancementError, AdvancementFlow } from "./advancement-flow.js";


/**
 * Advancement that presents the player with the option to roll hit points at each level or select the average value.
 * Keeps track of player hit point rolls or selection for each class level. **Can only be added to classes and each
 * class can only have one.**
 *
 * @extends {Advancement}
 */
export class HitPointsAdvancement extends Advancement {

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      order: 10,
      icon: "icons/svg/regen.svg",
      title: game.i18n.localize("DND5E.AdvancementHitPointsTitle"),
      hint: game.i18n.localize("DND5E.AdvancementHitPointsHint"),
      multiLevel: true,
      apps: {
        flow: HitPointsFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return Array.numbersBetween(1, CONFIG.DND5E.maxLevel);
  }

  /* -------------------------------------------- */

  /**
   * Shortcut to the hit die used by the class.
   * @returns {string}
   */
  get hitDie() {
    return this.parent.data.data.hitDice;
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
  titleForLevel(level) {
    const hp = this.valueForLevel(level);
    if ( !hp ) return this.title;
    return `${this.title}: <strong>${hp}</strong>`;
  }

  /* -------------------------------------------- */

  /**
   * Hit points given at the provided level.
   * @param {number} level   Level for which to get hit points.
   * @returns {number|null}  Hit points for level or null if none have been taken.
   */
  valueForLevel(level) {
    return this.constructor.valueForLevel(this.data.value, this.hitDieValue, level);
  }

  /* -------------------------------------------- */

  /**
   * Hit points given at the provided level.
   * @param {object} data         Contents of `data.value` used to determine this value.
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
    return Object.keys(this.data.value).reduce((total, level) => total + this.valueForLevel(parseInt(level)), 0);
  }

  /* -------------------------------------------- */
  /*  Editing Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static availableForType(type) {
    return type === "class";
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static availableForItem(item) {
    return !item.data.data.advancement.find(a => a.type === "HitPoints");
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  apply(level, data) {
    const actorData = this.actor.data.data;
    let value = this.valueForLevel(level);

    // Check for difference between stored value and updated
    value = this.constructor.valueForLevel(data, this.hitDieValue, level) - value;

    // Add con modifier if the level has never been applied before
    if ( this.data.value[level] === undefined ) value += actorData.abilities.con?.mod ?? 0;

    this.actor.data.update({
      "data.attributes.hp.max": actorData.attributes.hp.max + value,
      "data.attributes.hp.value": actorData.attributes.hp.value + value
    });
    this.updateSource({ value: data });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  reverse(level) {
    const actorData = this.actor.data.data;
    let value = this.valueForLevel(level);
    if ( value === undefined ) return;

    value += actorData.abilities.con?.mod ?? 0;
    this.actor.data.update({
      "data.attributes.hp.max": actorData.attributes.hp.max - value,
      "data.attributes.hp.value": actorData.attributes.hp.value - value
    });
    this.updateSource({ [`value.-=${level}`]: null });
  }

}


/**
 * Inline application that presents hit points selection upon level up.
 *
 * @extends {AdvancementFlow}
 */
export class HitPointsFlow extends AdvancementFlow {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/hit-points-flow.html"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    const value = this.advancement.data.value[this.level];

    // If value is empty, `useAverage` should default to the value selected at the previous level
    let useAverage = value === "avg";
    if ( !value ) {
      const lastValue = this.advancement.data.value[this.level - 1];
      if ( lastValue === "avg" ) useAverage = true;
    }

    return foundry.utils.mergeObject(super.getData(), {
      isFirstClassLevel: (this.level === 1) && this.advancement.parent.isOriginalClass,
      hitDie: this.advancement.hitDie,
      dieValue: this.advancement.hitDieValue,
      data: {
        value: Number.isInteger(value) ? value : "",
        useAverage
      }
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    this.form.querySelector(".averageCheckbox")?.addEventListener("change", event => {
      this.form.querySelector(".rollResult").disabled = event.target.checked;
      this.form.querySelector(".rollButton").disabled = event.target.checked;
    });
    this.form.querySelector(".rollButton")?.addEventListener("click", async event => {
      const roll = await this.advancement.actor.rollHitPoints(this.advancement.parent);
      this.form.querySelector(".rollResult").value = roll.total;
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _updateObject(event, formData) {
    let value;
    if ( formData.useMax ) value = "max";
    else if ( formData.useAverage ) value = "avg";
    else if ( Number.isInteger(formData.value) ) value = parseInt(formData.value);

    if ( value !== undefined ) return this.advancement.apply(this.level, { [this.level]: value });

    this.form.querySelector(".rollResult")?.classList.add("error");
    const errorType = formData.value ? "Invalid" : "Empty";
    throw new AdvancementError(game.i18n.localize(`DND5E.AdvancementHitPoints${errorType}Error`));
  }

}
