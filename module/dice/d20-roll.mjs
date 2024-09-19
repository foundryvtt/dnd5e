import { areKeysPressed } from "../utils.mjs";

const { Die, NumericTerm, OperatorTerm } = foundry.dice.terms;

/**
 * Configuration data for the process of rolling d20 rolls.
 *
 * @typedef {BasicRollProcessConfiguration} D20RollProcessConfiguration
 * @property {boolean} elvenAccuracy         Use three dice when rolling with advantage.
 * @property {boolean} halflingLucky         Add a re-roll once modifier to the d20 die.
 * @property {D20RollConfiguration[]} rolls  Configuration data for individual rolls.
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
 * @property {boolean} advantage       Is the roll granted advantage?
 * @property {boolean} disadvantage    Is the roll granted disadvantage?
 * @property {number} criticalSuccess  The value of the d20 die to be considered a critical success.
 * @property {number} criticalFailure  The value of the d20 die to be considered a critical failure.
 * @property {number} maximum          Maximum number the d20 die can roll.
 * @property {number} minimum          Minimum number the d20 die can roll.
 */

/**
 * A type of Roll specific to a d20-based check, save, or attack roll in the 5e system.
 * @param {string} formula                       The string formula to parse
 * @param {object} data                          The data object against which to parse attributes within the formula
 * @param {object} [options={}]                  Extra optional arguments which describe or modify the D20Roll
 * @param {number} [options.advantageMode]       What advantage modifier to apply to the roll (none, advantage,
 *                                               disadvantage)
 * @param {number} [options.critical]            The value of d20 result which represents a critical success
 * @param {number} [options.fumble]              The value of d20 result which represents a critical failure
 * @param {(number)} [options.targetValue]       Assign a target value against which the result of this roll should be
 *                                               compared
 * @param {boolean} [options.elvenAccuracy=false]      Allow Elven Accuracy to modify this roll?
 * @param {boolean} [options.halflingLucky=false]      Allow Halfling Luck to modify this roll?
 * @param {boolean} [options.reliableTalent=false]     Allow Reliable Talent to modify this roll?
 */
export default class D20Roll extends Roll {
  constructor(formula, data, options) {
    super(formula, data, options);
    if ( !this.options.configured ) this.configureModifiers();
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
   * Determine whether a d20 roll should be fast-forwarded, and whether advantage or disadvantage should be applied.
   * @param {object} [options]
   * @param {Event} [options.event]                               The Event that triggered the roll.
   * @param {boolean} [options.advantage]                         Is something granting this roll advantage?
   * @param {boolean} [options.disadvantage]                      Is something granting this roll disadvantage?
   * @param {boolean} [options.fastForward]                       Should the roll dialog be skipped?
   * @returns {{advantageMode: D20Roll.ADV_MODE, isFF: boolean}}  Whether the roll is fast-forwarded, and its advantage
   *                                                              mode.
   */
  static determineAdvantageMode({event, advantage=false, disadvantage=false, fastForward}={}) {
    const keys = {
      normal: areKeysPressed(event, "skipDialogNormal"),
      advantage: areKeysPressed(event, "skipDialogAdvantage"),
      disadvantage: areKeysPressed(event, "skipDialogDisadvantage")
    };
    const isFF = fastForward ?? Object.values(keys).some(k => k);
    let advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.NORMAL;
    if ( advantage || keys.advantage ) advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE;
    else if ( disadvantage || keys.disadvantage ) advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE;
    return {isFF: !!isFF, advantageMode};
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

  /**
   * The HTML template path used to configure evaluation of this Roll
   * @type {string}
   */
  static EVALUATION_TEMPLATE = "systems/dnd5e/templates/chat/roll-dialog.hbs";

  /* -------------------------------------------- */

  /**
   * Does this roll start with a d20?
   * @type {boolean}
   */
  get validD20Roll() {
    return (this.terms[0] instanceof Die) && (this.terms[0].faces === 20);
  }

  /* -------------------------------------------- */

  /**
   * A convenience reference for whether this D20Roll has advantage
   * @type {boolean}
   */
  get hasAdvantage() {
    return this.options.advantageMode === D20Roll.ADV_MODE.ADVANTAGE;
  }

  /* -------------------------------------------- */

  /**
   * A convenience reference for whether this D20Roll has disadvantage
   * @type {boolean}
   */
  get hasDisadvantage() {
    return this.options.advantageMode === D20Roll.ADV_MODE.DISADVANTAGE;
  }

  /* -------------------------------------------- */

  /**
   * Is this roll a critical success? Returns undefined if roll isn't evaluated.
   * @type {boolean|void}
   */
  get isCritical() {
    if ( !this.validD20Roll || !this._evaluated ) return undefined;
    if ( !Number.isNumeric(this.options.critical) ) return false;
    return this.dice[0].total >= this.options.critical;
  }

  /* -------------------------------------------- */

  /**
   * Is this roll a critical failure? Returns undefined if roll isn't evaluated.
   * @type {boolean|void}
   */
  get isFumble() {
    if ( !this.validD20Roll || !this._evaluated ) return undefined;
    if ( !Number.isNumeric(this.options.fumble) ) return false;
    return this.dice[0].total <= this.options.fumble;
  }

  /* -------------------------------------------- */
  /*  D20 Roll Methods                            */
  /* -------------------------------------------- */

  /**
   * Apply optional modifiers which customize the behavior of the d20term
   * @private
   */
  configureModifiers() {
    if ( !this.validD20Roll ) return;

    const d20 = this.terms[0];
    d20.modifiers = [];

    // Halfling Lucky
    if ( this.options.halflingLucky ) d20.modifiers.push("r1=1");

    // Reliable Talent
    if ( this.options.reliableTalent ) d20.modifiers.push("min10");

    // Handle Advantage or Disadvantage
    if ( this.hasAdvantage ) {
      d20.number = this.options.elvenAccuracy ? 3 : 2;
      d20.modifiers.push("kh");
      d20.options.advantage = true;
    }
    else if ( this.hasDisadvantage ) {
      d20.number = 2;
      d20.modifiers.push("kl");
      d20.options.disadvantage = true;
    }
    else d20.number = 1;

    // Assign critical and fumble thresholds
    if ( this.options.critical ) d20.options.critical = this.options.critical;
    if ( this.options.fumble ) d20.options.fumble = this.options.fumble;
    if ( this.options.targetValue ) d20.options.target = this.options.targetValue;

    // Re-compile the underlying formula
    this._formula = this.constructor.getFormula(this.terms);

    // Mark configuration as complete
    this.options.configured = true;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async toMessage(messageData={}, options={}) {
    // Record the preferred rollMode
    options.rollMode ??= this.options.rollMode;
    if ( options.rollMode === "roll" ) options.rollMode = undefined;
    options.rollMode ||= game.settings.get("core", "rollMode");

    // Evaluate the roll now so we have the results available to determine whether reliable talent came into play
    if ( !this._evaluated ) await this.evaluate({ allowInteractive: options.rollMode !== CONST.DICE_ROLL_MODES.BLIND });

    // Add appropriate advantage mode message flavor and dnd5e roll flags
    messageData.flavor = messageData.flavor || this.options.flavor;
    if ( this.hasAdvantage ) messageData.flavor += ` (${game.i18n.localize("DND5E.Advantage")})`;
    else if ( this.hasDisadvantage ) messageData.flavor += ` (${game.i18n.localize("DND5E.Disadvantage")})`;

    // Add reliable talent to the d20-term flavor text if it applied
    if ( this.validD20Roll && this.options.reliableTalent ) {
      const d20 = this.dice[0];
      const isRT = d20.results.every(r => !r.active || (r.result < 10));
      const label = `(${game.i18n.localize("DND5E.FlagsReliableTalent")})`;
      if ( isRT ) d20.options.flavor = d20.options.flavor ? `${d20.options.flavor} (${label})` : label;
    }

    return super.toMessage(messageData, options);
  }

  /* -------------------------------------------- */
  /*  Configuration Dialog                        */
  /* -------------------------------------------- */

  /**
   * Create a Dialog prompt used to configure evaluation of an existing D20Roll instance.
   * @param {object} data                     Dialog configuration data
   * @param {string} [data.title]             The title of the shown dialog window
   * @param {number} [data.defaultRollMode]   The roll mode that the roll mode select element should default to
   * @param {number} [data.defaultAction]     The button marked as default
   * @param {FormSelectOption[]} [data.ammunitionOptions]  Selectable ammunition options.
   * @param {FormSelectOption[]} [data.attackModes]        Selectable attack modes.
   * @param {boolean} [data.chooseModifier]   Choose which ability modifier should be applied to the roll?
   * @param {string} [data.defaultAbility]    For tool rolls, the default ability modifier applied to the roll
   * @param {FormSelectOption[]} [data.masteryOptions]     Selectable weapon masteries.
   * @param {string} [data.template]          A custom path to an HTML template to use instead of the default
   * @param {object} options                  Additional Dialog customization options
   * @returns {Promise<D20Roll|null>}         A resulting D20Roll object constructed with the dialog, or null if the
   *                                          dialog was closed
   */
  async configureDialog({
    title, defaultRollMode, defaultAction=D20Roll.ADV_MODE.NORMAL, ammunitionOptions,
    attackModes, chooseModifier=false, defaultAbility, masteryOptions, template
  }={}, options={}) {

    // Render the Dialog inner HTML
    const content = await renderTemplate(template ?? this.constructor.EVALUATION_TEMPLATE, {
      formulas: [{formula: `${this.formula} + @bonus`}],
      defaultRollMode,
      rollModes: CONFIG.Dice.rollModes,
      ammunitionOptions,
      attackModes,
      chooseModifier,
      defaultAbility,
      masteryOptions,
      abilities: CONFIG.DND5E.abilities
    });

    let defaultButton = "normal";
    switch ( defaultAction ) {
      case D20Roll.ADV_MODE.ADVANTAGE: defaultButton = "advantage"; break;
      case D20Roll.ADV_MODE.DISADVANTAGE: defaultButton = "disadvantage"; break;
    }

    // Create the Dialog window and await submission of the form
    return new Promise(resolve => {
      new Dialog({
        title,
        content,
        buttons: {
          advantage: {
            label: game.i18n.localize("DND5E.Advantage"),
            callback: html => resolve(this._onDialogSubmit(html, D20Roll.ADV_MODE.ADVANTAGE))
          },
          normal: {
            label: game.i18n.localize("DND5E.Normal"),
            callback: html => resolve(this._onDialogSubmit(html, D20Roll.ADV_MODE.NORMAL))
          },
          disadvantage: {
            label: game.i18n.localize("DND5E.Disadvantage"),
            callback: html => resolve(this._onDialogSubmit(html, D20Roll.ADV_MODE.DISADVANTAGE))
          }
        },
        default: defaultButton,
        close: () => resolve(null)
      }, options).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle submission of the Roll evaluation configuration Dialog
   * @param {jQuery} html            The submitted dialog content
   * @param {number} advantageMode   The chosen advantage mode
   * @returns {D20Roll}              This damage roll.
   * @private
   */
  _onDialogSubmit(html, advantageMode) {
    const formData = new FormDataExtended(html[0].querySelector("form"));
    const submitData = foundry.utils.expandObject(formData.object);

    // Append a situational bonus term
    if ( submitData.bonus ) {
      const bonus = new Roll(submitData.bonus, this.data);
      if ( !(bonus.terms[0] instanceof OperatorTerm) ) this.terms.push(new OperatorTerm({operator: "+"}));
      this.terms = this.terms.concat(bonus.terms);
    }

    // Set the ammunition
    if ( submitData.ammunition ) this.options.ammunition = submitData.ammunition;

    // Set the attack mode
    if ( submitData.attackMode ) this.options.attackMode = submitData.attackMode;

    // Customize the modifier
    if ( submitData.ability ) {
      const abl = this.data.abilities[submitData.ability];
      this.terms = this.terms.flatMap(t => {
        if ( t.term === "@mod" ) return new NumericTerm({number: abl.mod});
        if ( t.term === "@abilityCheckBonus" ) {
          const bonus = abl.bonuses?.check;
          if ( bonus ) return new Roll(bonus, this.data).terms;
          return new NumericTerm({number: 0});
        }
        return t;
      });
      this.options.flavor += ` (${CONFIG.DND5E.abilities[submitData.ability]?.label ?? ""})`;
    }

    // Set the mastery
    if ( submitData.mastery ) this.options.mastery = submitData.mastery;

    // Apply advantage or disadvantage
    this.options.advantageMode = advantageMode;
    this.options.rollMode = submitData.rollMode;
    this.configureModifiers();
    return this;
  }
}
