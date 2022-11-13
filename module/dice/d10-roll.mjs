/**
 * A type of Roll specific to a d10-based check, save, or attack roll in the 5e system.
 * @param {string} formula                       The string formula to parse
 * @param {object} data                          The data object against which to parse attributes within the formula
 * @param {object} [options={}]                  Extra optional arguments which describe or modify the D10Roll
 * @param {number} [options.advantageMode]       What advantage modifier to apply to the roll (none, advantage,
 *                                               disadvantage)
 * @param {number} [options.critical]            The value of d10 result which represents a critical success
 * @param {number} [options.fumble]              The value of d10 result which represents a critical failure
 * @param {(number)} [options.targetValue]       Assign a target value against which the result of this roll should be
 *                                               compared
 */
export default class D10Roll extends Roll {
  constructor(formula, data, options) {
    super(formula, data, options);
    if ( !this.options.configured ) this.configureModifiers();
  }

  /* -------------------------------------------- */

  /**
   * Create a D10Roll from a standard Roll instance.
   * @param {Roll} roll
   * @returns {D10Roll}
   */
  static fromRoll(roll) {
    const newRoll = new this(roll.formula, roll.data, roll.options);
    Object.assign(newRoll, roll);
    return newRoll;
  }

  /* -------------------------------------------- */

  /**
   * Advantage mode of a 5e d10 roll
   * @enum {number}
   */
  static ADV_MODE = {
    NORMAL: 0,
    ADVANTAGE: 1,
    DISADVANTAGE: -1
  }

  /* -------------------------------------------- */

  /**
   * The HTML template path used to configure evaluation of this Roll
   * @type {string}
   */
  static EVALUATION_TEMPLATE = "systems/shaper/templates/chat/roll-dialog.hbs";

  /* -------------------------------------------- */

  /**
   * Does this roll start with a d10?
   * @type {boolean}
   */
  get validD10Roll() {
    return (this.terms[0] instanceof Die) && (this.terms[0].faces === 10);
  }

  /* -------------------------------------------- */

  /**
   * A convenience reference for whether this D10Roll has advantage
   * @type {boolean}
   */
  get hasAdvantage() {
    return this.options.advantageMode === D10Roll.ADV_MODE.ADVANTAGE;
  }

  /* -------------------------------------------- */

  /**
   * A convenience reference for whether this D10Roll has disadvantage
   * @type {boolean}
   */
  get hasDisadvantage() {
    return this.options.advantageMode === D10Roll.ADV_MODE.DISADVANTAGE;
  }

  /* -------------------------------------------- */

  /**
   * Is this roll a critical success? Returns undefined if roll isn't evaluated.
   * @type {boolean|void}
   */
  get isCritical() {
    if ( !this.validD10Roll || !this._evaluated ) return undefined;
    if ( !Number.isNumeric(this.options.critical) ) return false;
    return this.dice[0].total >= this.options.critical;
  }

  /* -------------------------------------------- */

  /**
   * Is this roll a critical failure? Returns undefined if roll isn't evaluated.
   * @type {boolean|void}
   */
  get isFumble() {
    if ( !this.validD10Roll || !this._evaluated ) return undefined;
    if ( !Number.isNumeric(this.options.fumble) ) return false;
    return this.dice[0].total <= this.options.fumble;
  }

  /* -------------------------------------------- */
  /*  D10 Roll Methods                            */
  /* -------------------------------------------- */

  /**
   * Apply optional modifiers which customize the behavior of the d10term
   * @private
   */
  configureModifiers() {
    if ( !this.validD10Roll ) return;

    const d10 = this.terms[0];
    d10.modifiers = [];
    
    d10.number = 2;

    let b = 11 - Math.abs(parseInt(this.options?.boonbane));
    let bane = b.toString();

    let baneBoundary = 5;

    // Clamp bane values that are too low
    if ( b < baneBoundary ) bane = baneBoundary.toString();


    // Handle Boon or Bane
    if ( this.hasAdvantage ) {
      d10.options.advantage = true;
    }
    else if ( this.hasDisadvantage ) {
      d10.modifiers.push("r>" + bane)
      d10.options.disadvantage = true;
    }

    // Assign critical and fumble thresholds
    if ( this.options.critical ) d10.options.critical = this.options.critical;
    if ( this.options.fumble ) d10.options.fumble = this.options.fumble;
    if ( this.options.targetValue ) d10.options.target = this.options.targetValue;

    // Re-compile the underlying formula
    this._formula = this.constructor.getFormula(this.terms);

    // Mark configuration as complete
    this.options.configured = true;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async toMessage(messageData={}, options={}) {

    // Evaluate the roll now so we have the results available to determine whether reliable talent came into play
    if ( !this._evaluated ) await this.evaluate({async: true});

    let bb = this.options?.boonbane

    // Add appropriate advantage mode message flavor and shaper roll flags
    messageData.flavor = messageData.flavor || this.options.flavor;
    if ( this.hasAdvantage ) messageData.flavor += ` (${game.i18n.localize("SHAPER.Boon")}) ` + bb;
    else if ( this.hasDisadvantage ) messageData.flavor += ` (${game.i18n.localize("SHAPER.Bane")}) ` + bb;

    // Record the preferred rollMode
    options.rollMode = options.rollMode ?? this.options.rollMode;
    return super.toMessage(messageData, options);
  }

  /* -------------------------------------------- */
  /*  Configuration Dialog                        */
  /* -------------------------------------------- */

  /**
   * Create a Dialog prompt used to configure evaluation of an existing D10Roll instance.
   * @param {object} data                     Dialog configuration data
   * @param {string} [data.title]             The title of the shown dialog window
   * @param {number} [data.defaultRollMode]   The roll mode that the roll mode select element should default to
   * @param {number} [data.defaultAction]     The button marked as default
   * @param {boolean} [data.chooseModifier]   Choose which ability modifier should be applied to the roll?
   * @param {string} [data.defaultAbility0]    For tool rolls, the default ability modifier applied to the roll
   * @param {string} [data.defaultAbility1]    For tool rolls, the default ability modifier applied to the roll
   * @param {string} [data.template]          A custom path to an HTML template to use instead of the default
   * @param {object} options                  Additional Dialog customization options
   * @returns {Promise<D10Roll|null>}         A resulting D10Roll object constructed with the dialog, or null if the
   *                                          dialog was closed
   */
  async configureDialog({title, defaultRollMode, defaultAction=D10Roll.ADV_MODE.NORMAL, chooseModifier=false,
    defaultAbility0, defaultAbility1, boonbane, template}={}, options={}) {

    // Render the Dialog inner HTML
    const content = await renderTemplate(template ?? this.constructor.EVALUATION_TEMPLATE, {
      formula: `${this.formula} + @bonus`,
      defaultRollMode,
      rollModes: CONFIG.Dice.rollModes,
      chooseModifier,
      defaultAbility0,
      defaultAbility1,
      boonbane,
      abilities: CONFIG.SHAPER.abilities
    });

    let defaultButton = "normal";
    switch ( defaultAction ) {
      case D10Roll.ADV_MODE.ADVANTAGE: defaultButton = "boon"; break;
      case D10Roll.ADV_MODE.DISADVANTAGE: defaultButton = "bane"; break;
    }

    // Create the Dialog window and await submission of the form
    return new Promise(resolve => {
      new Dialog({
        title,
        content,
        buttons: {
          boon: {
            label: game.i18n.localize("SHAPER.Boon"),
            callback: html => resolve(this._onDialogSubmit(html, D10Roll.ADV_MODE.ADVANTAGE))
          },
          normal: {
            label: game.i18n.localize("SHAPER.Normal"),
            callback: html => resolve(this._onDialogSubmit(html, D10Roll.ADV_MODE.NORMAL))
          },
          bane: {
            label: game.i18n.localize("SHAPER.Bane"),
            callback: html => resolve(this._onDialogSubmit(html, D10Roll.ADV_MODE.DISADVANTAGE))
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
   * @returns {D10Roll}              This damage roll.
   * @private
   */
  _onDialogSubmit(html, advantageMode) {
    const form = html[0].querySelector("form");

    // Append a situational bonus term
    if ( form.bonus.value ) {
      const bonus = new Roll(form.bonus.value, this.data);
      if ( !(bonus.terms[0] instanceof OperatorTerm) ) this.terms.push(new OperatorTerm({operator: "+"}));
      this.terms = this.terms.concat(bonus.terms);
    }

    // Customize the modifier
    if ( form.ability0?.value && form.ability1?.value ) {
      const abl0 = this.data.abilities[form.ability0.value];
      const abl1 = this.data.abilities[form.ability1.value];
      const points = this.data.points;
      this.terms = this.terms.flatMap(t => {
        if ( t.term === "@mod" ) return new NumericTerm({number: abl0.mod + abl1.mod + points});
        if ( t.term === "@abilityCheckBonus" ) {
          const bonus = abl0.bonuses?.check + abl1.bonuses?.check;
          if ( bonus ) return new Roll(bonus, this.data).terms;
          return new NumericTerm({number: 0});
        }
        return t;
      });
      this.options.flavor += ` (${CONFIG.SHAPER.abilities[form.ability0.value]})`;
      this.options.flavor += ` (${CONFIG.SHAPER.abilities[form.ability1.value]})`;
    }

    // Apply advantage or disadvantage
    this.options.advantageMode = advantageMode;
    this.options.rollMode = form.rollMode.value;
    this.options.boonbane = form.boonbane.value;
    this.configureModifiers();
    return this;
  }
}
