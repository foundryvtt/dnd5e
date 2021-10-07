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
 * @extends {Roll}
 */
export default class D20Roll extends Roll {
  constructor(formula, data, options) {
    super(formula, data, options);
    if ( !((this.terms[0] instanceof Die) && (this.terms[0].faces === 20)) ) {
      throw new Error(`Invalid D20Roll formula provided ${this._formula}`);
    }
    this.configureModifiers();
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
  }

  /**
   * The HTML template path used to configure evaluation of this Roll
   * @type {string}
   */
  static EVALUATION_TEMPLATE = "systems/dnd5e/templates/chat/roll-dialog.html";

  /* -------------------------------------------- */

  /**
   * A convenience reference for whether this D20Roll has advantage
   * @type {boolean}
   */
  get hasAdvantage() {
    return this.options.advantageMode === D20Roll.ADV_MODE.ADVANTAGE;
  }

  /**
   * A convenience reference for whether this D20Roll has disadvantage
   * @type {boolean}
   */
  get hasDisadvantage() {
    return this.options.advantageMode === D20Roll.ADV_MODE.DISADVANTAGE;
  }

  /* -------------------------------------------- */
  /*  D20 Roll Methods                            */
  /* -------------------------------------------- */

  /**
   * Apply optional modifiers which customize the behavior of the d20term
   * @private
   */
  configureModifiers() {
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
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async toMessage(messageData={}, options={}) {

    // Evaluate the roll now so we have the results available to determine whether reliable talent came into play
    if ( !this._evaluated ) await this.evaluate({async: true});

    // Add appropriate advantage mode message flavor and dnd5e roll flags
    messageData.flavor = messageData.flavor || this.options.flavor;
    if ( this.hasAdvantage ) messageData.flavor += ` (${game.i18n.localize("DND5E.Advantage")})`;
    else if ( this.hasDisadvantage ) messageData.flavor += ` (${game.i18n.localize("DND5E.Disadvantage")})`;

    // Add reliable talent to the d20-term flavor text if it applied
    if ( this.options.reliableTalent ) {
      const d20 = this.dice[0];
      const isRT = d20.results.every(r => !r.active || (r.result < 10));
      const label = `(${game.i18n.localize("DND5E.FlagsReliableTalent")})`;
      if ( isRT ) d20.options.flavor = d20.options.flavor ? `${d20.options.flavor} (${label})` : label;
    }

    // Record the preferred rollMode
    options.rollMode = options.rollMode ?? this.options.rollMode;
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
   * @param {boolean} [data.chooseModifier]   Choose which ability modifier should be applied to the roll?
   * @param {string} [data.defaultAbility]    For tool rolls, the default ability modifier applied to the roll
   * @param {string} [data.template]          A custom path to an HTML template to use instead of the default
   * @param {object} options                  Additional Dialog customization options
   * @returns {Promise<D20Roll|null>}         A resulting D20Roll object constructed with the dialog, or null if the
   *                                          dialog was closed
   */
  async configureDialog({title, defaultRollMode, defaultAction=D20Roll.ADV_MODE.NORMAL, chooseModifier=false,
    defaultAbility, template}={}, options={}) {

    // Render the Dialog inner HTML
    const content = await renderTemplate(template ?? this.constructor.EVALUATION_TEMPLATE, {
      formula: `${this.formula} + @bonus`,
      defaultRollMode,
      rollModes: CONFIG.Dice.rollModes,
      chooseModifier,
      defaultAbility,
      abilities: CONFIG.DND5E.abilities
    });

    let defaultButton = "normal";
    switch (defaultAction) {
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
    const form = html[0].querySelector("form");

    // Append a situational bonus term
    if ( form.bonus.value ) {
      const bonus = new Roll(form.bonus.value, this.data);
      if ( !(bonus.terms[0] instanceof OperatorTerm) ) this.terms.push(new OperatorTerm({operator: "+"}));
      this.terms = this.terms.concat(bonus.terms);
    }

    // Customize the modifier
    if ( form.ability?.value ) {
      const abl = this.data.abilities[form.ability.value];
      this.terms.findSplice(t => t.term === "@mod", new NumericTerm({number: abl.mod}));
      this.options.flavor += ` (${CONFIG.DND5E.abilities[form.ability.value]})`;
    }

    // Apply advantage or disadvantage
    this.options.advantageMode = advantageMode;
    this.options.rollMode = form.rollMode.value;
    this.configureModifiers();
    return this;
  }
}
