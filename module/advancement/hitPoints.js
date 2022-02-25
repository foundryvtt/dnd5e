import { Advancement } from "./advancement.js";
import { AdvancementFlow } from "./advancementFlow.js";


/**
 * Inline application that presents hit points selection upon level up.
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
    const value = this.advancement.data.value[this.options.level];
    return foundry.utils.mergeObject(super.getData(), {
      hitDie: this.advancement.hitDie,
      dieValue: this.advancement.hitDieValue,
      data: {
        value: Number.isInteger(value) ? value : "",
        useAverage: value === true
      }
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    const form = html[0];
    form.querySelector(".rollButton")?.addEventListener("click", this._onRollDice.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Trigger a hit dice roll and add the result to the field.
   */
  async _onRollDice(event) {
    const actor = this.advancement.parent.parent;
    const roll = await game.dnd5e.dice.damageRoll({
      event,
      parts: [`1${this.advancement.hitDie}`],
      title: `Roll Hit Points: ${actor}`,
      flavor: "Roll Hit Points",
      allowCritical: false,
      fastForward: true,
      messageData: {
        speaker: ChatMessage.getSpeaker({ actor }),
        "flags.dnd5e.roll": { type: "hitPoints" }
      }
    });
    event.target.parentElement.querySelector(".rollResult").value = roll.total;
  }

}


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
  static flowApp = HitPointsFlow;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static multiLevel = true;

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return this.constructor.allLevels;
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
    const value = this.data.value[level];
    if ( !value ) return null;

    if ( value !== true ) return value;

    // Fixed value chosen
    if ( level === 1 ) return this.hitDieValue;
    return (this.hitDieValue / 2) + 1;
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

}
