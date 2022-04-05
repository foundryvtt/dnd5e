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

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static order = 10;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultTitle = "DND5E.AdvancementHitPointsTitle";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultIcon = "icons/svg/regen.svg";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static hint = "DND5E.AdvancementHitPointsHint";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get flowApp() { return HitPointsFlow; }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static multiLevel = true;

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
  static availableForItem(item) {
    if ( item.type !== "class" ) return false;
    return !item.data.data.advancement.find(a => a.type === "HitPoints");
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  propertyUpdates({ level, updates, reverse=false }) {
    const actorData = this.actor.data.data;
    const conMod = actorData.abilities.con?.mod ?? 0;
    const noStoredValue = this.data.value[level] === undefined;
    let value = this.valueForLevel(level) ?? 0;

    // When reversing, remove both value and constitution modifier unless no advancement data is stored
    if ( reverse ) {
      if ( noStoredValue ) return {};
      value = (value + conMod) * -1;
    }

    // If no update data is available, apply full value and constitution modifier
    else if ( !updates ) value += conMod;

    // Check for difference between stored value and updated, and apply con modifier if it hasn't been applied before
    else {
      const modified = this.constructor.valueForLevel(updates, this.hitDieValue, level);
      value = modified - value;
      if ( noStoredValue ) value += conMod;
    }

    if ( value === 0 ) return {};
    return {
      "data.attributes.hp.max": actorData.attributes.hp.max + value,
      "data.attributes.hp.value": actorData.attributes.hp.value + value
    };
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
    this.form.querySelector(".averageCheckbox")?.addEventListener("change", this._onAverageChanged.bind(this));
    this.form.querySelector(".rollButton")?.addEventListener("click", this._onRollDice.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Toggle status of hit points field and roll button based on whether use average checkbox is checked.
   * @param {Event} event  Change to checkbox that triggers this update.
   */
  _onAverageChanged(event) {
    this.form.querySelector(".rollResult").disabled = event.target.checked;
    this.form.querySelector(".rollButton").disabled = event.target.checked;
  }

  /* -------------------------------------------- */

  /**
   * Trigger a hit dice roll and add the result to the field.
   * @param {Event} event  Click that triggered the roll.
   */
  async _onRollDice(event) {
    // TODO: Maybe this should be `Actor#rollHitPoints`?
    const actor = this.advancement.actor;
    const flavor = game.i18n.localize("DND5E.AdvancementHitPointsRollMessage");
    const roll = await game.dnd5e.dice.damageRoll({
      event,
      parts: [`1${this.advancement.hitDie}`],
      title: `${flavor}: ${actor}`,
      flavor,
      allowCritical: false,
      fastForward: true,
      messageData: {
        speaker: ChatMessage.getSpeaker({ actor }),
        "flags.dnd5e.roll": { type: "hitPoints" }
      }
    });
    event.target.closest(".rolls").querySelector(".rollResult").value = roll.total;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareUpdate(formData) {
    let value;
    if ( formData.useMax ) value = "max";
    else if ( formData.useAverage ) value = "avg";
    else if ( Number.isInteger(formData.value) ) value = parseInt(formData.value);

    if ( value !== undefined ) return { [this.level]: value };

    this.form.querySelector(".rollResult").classList.add("error");
    const errorType = formData.value ? "Invalid" : "Empty";
    throw new AdvancementError(game.i18n.localize(`DND5E.AdvancementHitPoints${errorType}Error`));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  reverseUpdate() {
    return { [`-=${this.level}`]: null };
  }

}
