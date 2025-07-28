import D20RollConfigurationDialog from "../applications/dice/d20-configuration-dialog.mjs";
import { areKeysPressed } from "../utils.mjs";
import BasicRoll from "./basic-roll.mjs";

/**
 * Configuration data for the process of rolling d20 rolls.
 *
 * @typedef {BasicRollProcessConfiguration} D20RollProcessConfiguration
 * @property {boolean} [advantage]             Apply advantage to each roll.
 * @property {boolean} [disadvantage]          Apply disadvantage to each roll.
 * @property {boolean} [elvenAccuracy]         Use three dice when rolling with advantage.
 * @property {boolean} [halflingLucky]         Add a re-roll once modifier to the d20 die.
 * @property {boolean} [reliableTalent]        Set the minimum for the d20 roll to 10.
 * @property {D20RollConfiguration[]} rolls    Configuration data for individual rolls.
 */

/**
 * D20 roll configuration data.
 *
 * @typedef {BasicRollConfiguration} D20RollConfiguration
 * @property {string[]} parts          Parts used to construct the roll formula, not including the d20 die.
 * @property {D20RollOptions} options  Options passed through to the roll.
 */

/**
 * Options that describe a d20 roll.
 *
 * @typedef {BasicRollOptions} D20RollOptions
 * @property {boolean} [advantage]       Does this roll potentially have advantage?
 * @property {boolean} [disadvantage]    Does this roll potentially have disadvantage?
 * @property {D20Roll.ADV_MODE} [advantageMode]  Final advantage mode.
 * @property {number} [criticalSuccess]  The value of the d20 die to be considered a critical success.
 * @property {number} [criticalFailure]  The value of the d20 die to be considered a critical failure.
 * @property {boolean} [elvenAccuracy]   Use three dice when rolling with advantage.
 * @property {boolean} [halflingLucky]   Add a re-roll once modifier to the d20 die.
 * @property {number} [maximum]          Maximum number the d20 die can roll.
 * @property {number} [minimum]          Minimum number the d20 die can roll.
 */

/* -------------------------------------------- */

/**
 * A type of Roll specific to a d20-based check, save, or attack roll in the 5e system.
 * @param {string} formula          The string formula to parse.
 * @param {object} data             The data object against which to parse attributes within the formula.
 * @param {D20RollOptions} options  Additional options that describe the d20 roll.
 */
export default class D20Roll extends BasicRoll {
  constructor(formula, data, options) {
    super(formula, data, options);
    this.#createD20Die();
    if ( !this.options.configured ) this.configureModifiers();
  }

  /* -------------------------------------------- */

  /**
   * Advantage mode of a 5e d20 roll
   * @enum {number}
   */
  static ADV_MODE = {
    NORMAL: 0,
    ADVANTAGE: 1,
    DISADVANTAGE: -1
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static DefaultConfigurationDialog = D20RollConfigurationDialog;

  /* -------------------------------------------- */
  /*  Static Construction                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static fromConfig(config, process) {
    const formula = [new CONFIG.Dice.D20Die().formula].concat(config.parts ?? []).join(" + ");
    config.options.criticalSuccess ??= CONFIG.Dice.D20Die.CRITICAL_SUCCESS_TOTAL;
    config.options.criticalFailure ??= CONFIG.Dice.D20Die.CRITICAL_FAILURE_TOTAL;
    config.options.elvenAccuracy ??= process.elvenAccuracy;
    config.options.halflingLucky ??= process.halflingLucky;
    config.options.reliableTalent ??= process.reliableTalent;
    config.options.target ??= process.target;
    return new this(formula, config.data, config.options);
  }

  /* -------------------------------------------- */

  /**
   * Create a D20Roll from a standard Roll instance.
   * @param {Roll} roll
   * @returns {D20Roll}
   */
  static fromRoll(roll) {
    const newRoll = new this(roll.formula, roll.data, roll.options);
    Object.assign(newRoll, roll);
    return newRoll;
  }

  /* -------------------------------------------- */

  /**
   * Determines whether the roll should be fast forwarded and what the default advantage mode should be.
   * @param {D20RollProcessConfiguration} config     Roll configuration data.
   * @param {BasicRollDialogConfiguration} dialog    Data for the roll configuration dialog.
   * @param {BasicRollMessageConfiguration} message  Configuration data that guides roll message creation.
   */
  static applyKeybindings(config, dialog, message) {
    const keys = {
      normal: areKeysPressed(config.event, "skipDialogNormal"),
      advantage: areKeysPressed(config.event, "skipDialogAdvantage"),
      disadvantage: areKeysPressed(config.event, "skipDialogDisadvantage")
    };

    // Should the roll configuration dialog be displayed?
    dialog.configure ??= !Object.values(keys).some(k => k);

    // Determine advantage mode
    for ( const roll of config.rolls ?? [] ) {
      if ( keys.normal && keys.advantage ) roll.options.advantageMode = this.ADV_MODE.ADVANTAGE;
      else if ( keys.normal && keys.disadvantage ) roll.options.advantageMode = this.ADV_MODE.DISADVANTAGE;
      else {
        const advantage = roll.options.advantage || config.advantage || keys.advantage;
        const disadvantage = roll.options.disadvantage || config.disadvantage || keys.disadvantage;
        if ( advantage && !disadvantage ) roll.options.advantageMode = this.ADV_MODE.ADVANTAGE;
        else if ( !advantage && disadvantage ) roll.options.advantageMode = this.ADV_MODE.DISADVANTAGE;
        else roll.options.advantageMode = this.ADV_MODE.NORMAL;
      }
    }
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The primary die used in this d20 roll.
   * @type {D20Die|void}
   */
  get d20() {
    if ( !(this.terms[0] instanceof foundry.dice.terms.Die) ) return;
    if ( !(this.terms[0] instanceof CONFIG.Dice.D20Die) ) this.#createD20Die();
    return this.terms[0];
  }

  /* -------------------------------------------- */

  /**
   * Set the d20 for this roll.
   */
  set d20(die) {
    if ( !(die instanceof CONFIG.Dice.D20Die) ) throw new Error(
      `D20 die must be an instance of ${CONFIG.Dice.D20Die.name}, instead a ${die.constructor.name} was provided.`
    );
    this.terms[0] = die;
  }

  /* -------------------------------------------- */

  /**
   * A convenience reference for whether this D20Roll has advantage.
   * @type {boolean}
   */
  get hasAdvantage() {
    return this.options.advantageMode === this.constructor.ADV_MODE.ADVANTAGE;
  }

  /* -------------------------------------------- */

  /**
   * A convenience reference for whether this D20Roll has disadvantage.
   * @type {boolean}
   */
  get hasDisadvantage() {
    return this.options.advantageMode === this.constructor.ADV_MODE.DISADVANTAGE;
  }

  /* -------------------------------------------- */

  /**
   * Is this roll a critical success? Returns undefined if roll isn't evaluated.
   * @type {boolean|void}
   */
  get isCritical() {
    return this.d20.isCriticalSuccess;
  }

  /* -------------------------------------------- */

  /**
   * Is this roll a critical failure? Returns undefined if roll isn't evaluated.
   * @type {boolean|void}
   */
  get isFumble() {
    return this.d20.isCriticalFailure;
  }

  /* -------------------------------------------- */

  /**
   * Does this roll start with a d20?
   * @type {boolean}
   */
  get validD20Roll() {
    return (this.d20 instanceof CONFIG.Dice.D20Die) && this.d20.isValid;
  }

  /* -------------------------------------------- */
  /*  Chat Messages                               */
  /* -------------------------------------------- */

  /** @override */
  static _prepareMessageData(rolls, messageData) {
    let advantage = true;
    let disadvantage = true;

    const rtLabel = game.i18n.localize("DND5E.FlagsReliableTalent");
    for ( const roll of rolls ) {
      if ( !roll.validD20Roll ) continue;
      if ( !roll.hasAdvantage ) advantage = false;
      if ( !roll.hasDisadvantage ) disadvantage = false;
      if ( roll.options.reliableTalent && roll.d20.results.every(r => !r.active || (r.result < 10)) ) {
        roll.d20.options.flavor = roll.d20.options.flavor ? `${roll.d20.options.flavor} (${rtLabel})` : rtLabel;
      }
    }

    messageData.flavor ??= "";
    if ( advantage ) messageData.flavor += ` (${game.i18n.localize("DND5E.Advantage")})`;
    else if ( disadvantage ) messageData.flavor += ` (${game.i18n.localize("DND5E.Disadvantage")})`;
  }

  /* -------------------------------------------- */
  /*  Roll Configuration                          */
  /* -------------------------------------------- */

  /**
   * Apply optional modifiers which customize the behavior of the d20term
   * @private
   */
  configureModifiers() {
    if ( !this.validD20Roll ) return;

    if ( this.options.advantageMode === undefined ) {
      const { advantage, disadvantage } = this.options;
      if ( advantage && !disadvantage ) this.options.advantageMode = this.constructor.ADV_MODE.ADVANTAGE;
      else if ( !advantage && disadvantage ) this.options.advantageMode = this.constructor.ADV_MODE.DISADVANTAGE;
      else this.options.advantageMode = this.constructor.ADV_MODE.NORMAL;
    }

    // Determine minimum, taking reliable talent into account
    let minimum = this.options.minimum;
    if ( this.options.reliableTalent ) minimum = Math.max(minimum ?? -Infinity, 10);

    // Directly modify the d20
    this.d20.applyFlag("elvenAccuracy", this.options.elvenAccuracy === true);
    this.d20.applyFlag("halflingLucky", this.options.halflingLucky === true);
    this.d20.applyAdvantage(this.options.advantageMode);
    this.d20.applyRange({ minimum, maximum: this.options.maximum });

    // Assign critical and fumble thresholds
    if ( this.options.criticalSuccess ) this.d20.options.criticalSuccess = this.options.criticalSuccess;
    if ( this.options.criticalFailure ) this.d20.options.criticalFailure = this.options.criticalFailure;
    if ( this.options.target ) this.d20.options.target = this.options.target;

    // Re-compile the underlying formula
    this.resetFormula();

    // Mark configuration as complete
    this.options.configured = true;
  }

  /* -------------------------------------------- */

  /**
   * Ensure the d20 die for this roll is actually a D20Die instance.
   */
  #createD20Die() {
    if ( this.terms[0] instanceof CONFIG.Dice.D20Die ) return;
    if ( !(this.terms[0] instanceof foundry.dice.terms.Die) ) return;
    const { number, faces, ...data } = this.terms[0];
    this.terms[0] = new CONFIG.Dice.D20Die({ ...data, number, faces });
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @override */
  static mergeOptions(original={}, other={}) {
    const merged = super.mergeOptions(original, other);
    merged.advantage = original.advantage || other.advantage;
    merged.disadvantage = original.disadvantage || other.disadvantage;
    merged.maximum = Math.min(original.maximum ?? Infinity, other.maximum ?? Infinity);
    merged.minimum = Math.max(original.minimum ?? -Infinity, other.minimum ?? -Infinity);
    return merged;
  }
}
