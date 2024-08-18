const { DiceTerm, FunctionTerm, NumericTerm, OperatorTerm, ParentheticalTerm, StringTerm } = foundry.dice.terms;

/**
 * Configuration data for the process of rolling a damage roll.
 *
 * @typedef {BasicRollProcessConfiguration} DamageRollProcessConfiguration
 * @property {DamageRollConfiguration[]} rolls         Configuration data for individual rolls.
 * @property {CriticalDamageConfiguration} [critical]  Critical configuration for all rolls.
 * @property {number} [scaling=0]                      Scale increase above base damage.
 */

/**
 * Damage roll configuration data.
 *
 * @typedef {BasicRollConfiguration} DamageRollConfiguration
 * @property {DamageRollOptions} [options] - Options passed through to the roll.
 */

/**
 * Options that describe a damage roll.
 *
 * @typedef {BasicRollOptions} DamageRollOptions
 * @property {boolean} [isCritical]                    Should critical damage be calculated for this roll?
 * @property {CriticalDamageConfiguration} [critical]  Critical configuration for this roll.
 * @property {string[]} [properties]                   Physical properties of the source (e.g. magical, silvered).
 * @property {string} [type]                           Type of damage represented.
 * @property {string[]} [types]                        List of damage types selectable in the configuration app. If no
 *                                                     type is provided, then the first of these types will be used.
 */

/**
 * Critical effects configuration data.
 *
 * @typedef {object} CriticalDamageConfiguration
 * @property {boolean} [allow=true]       Should critical damage be allowed?
 * @property {number} [multiplier=2]      Amount by which to multiply critical damage.
 * @property {number} [bonusDice=0]       Additional dice added to first term when calculating critical damage.
 * @property {string} [bonusDamage]       Additional, unmodified, damage formula added when calculating a critical.
 * @property {boolean} [multiplyDice]     Should dice result be multiplied rather than number of dice rolled increased?
 * @property {boolean} [multiplyNumeric]  Should numeric terms be multiplied along side dice during criticals?
 * @property {string} [powerfulCritical]  Maximize result of extra dice added by critical, rather than rolling.
 */

/**
 * A type of Roll specific to a damage (or healing) roll in the 5e system.
 * @param {string} formula                       The string formula to parse
 * @param {object} data                          The data object against which to parse attributes within the formula
 * @param {object} [options={}]                  Extra optional arguments which describe or modify the DamageRoll
 * @param {number} [options.criticalBonusDice=0]      A number of bonus damage dice that are added for critical hits
 * @param {number} [options.criticalMultiplier=2]     A critical hit multiplier which is applied to critical hits
 * @param {boolean} [options.multiplyNumeric=false]   Multiply numeric terms by the critical multiplier
 * @param {boolean} [options.powerfulCritical=false]  Apply the "powerful criticals" house rule to critical hits
 * @param {string} [options.criticalBonusDamage]      An extra damage term that is applied only on a critical hit
 */
export default class DamageRoll extends Roll {
  constructor(formula, data, options) {
    super(formula, data, options);
    if ( !this.options.preprocessed ) this.preprocessFormula();
    // For backwards compatibility, skip rolls which do not have the "critical" option defined
    if ( (this.options.critical !== undefined) && !this.options.configured ) this.configureDamage();
  }

  /* -------------------------------------------- */

  /**
   * Create a DamageRoll from a standard Roll instance.
   * @param {Roll} roll
   * @returns {DamageRoll}
   */
  static fromRoll(roll) {
    const newRoll = new this(roll.formula, roll.data, roll.options);
    Object.assign(newRoll, roll);
    return newRoll;
  }

  /* -------------------------------------------- */

  /**
   * The HTML template path used to configure evaluation of this Roll
   * @type {string}
   */
  static EVALUATION_TEMPLATE = "systems/dnd5e/templates/chat/roll-dialog.hbs";

  /* -------------------------------------------- */

  /**
   * A convenience reference for whether this DamageRoll is a critical hit
   * @type {boolean}
   */
  get isCritical() {
    return this.options.critical;
  }

  /* -------------------------------------------- */
  /*  Damage Roll Methods                         */
  /* -------------------------------------------- */

  /**
   * Perform any term-merging required to ensure that criticals can be calculated successfully.
   * @protected
   */
  preprocessFormula() {
    for ( let [i, term] of this.terms.entries() ) {
      const nextTerm = this.terms[i + 1];
      const prevTerm = this.terms[i - 1];

      // Convert shorthand dX terms to 1dX preemptively to allow them to be appropriately doubled for criticals
      if ( (term instanceof StringTerm) && /^d\d+/.test(term.term) && !(prevTerm instanceof ParentheticalTerm) ) {
        const formula = `1${term.term}`;
        const newTerm = new Roll(formula).terms[0];
        this.terms.splice(i, 1, newTerm);
        term = newTerm;
      }

      // Merge parenthetical terms that follow string terms to build a dice term (to allow criticals)
      else if ( (term instanceof ParentheticalTerm) && (prevTerm instanceof StringTerm)
        && prevTerm.term.match(/^[0-9]*d$/)) {
        if ( term.isDeterministic ) {
          let newFormula = `${prevTerm.term}${term.evaluate().total}`;
          let deleteCount = 2;

          // Merge in any roll modifiers
          if ( nextTerm instanceof StringTerm ) {
            newFormula += nextTerm.term;
            deleteCount += 1;
          }

          const newTerm = (new Roll(newFormula)).terms[0];
          this.terms.splice(i - 1, deleteCount, newTerm);
          term = newTerm;
        }
      }

      // Merge any parenthetical terms followed by string terms
      else if ( (term instanceof ParentheticalTerm || term instanceof FunctionTerm) && (nextTerm instanceof StringTerm)
        && nextTerm.term.match(/^d[0-9]*$/)) {
        if ( term.isDeterministic ) {
          const newFormula = `${term.evaluate().total}${nextTerm.term}`;
          const newTerm = (new Roll(newFormula)).terms[0];
          this.terms.splice(i, 2, newTerm);
          term = newTerm;
        }
      }
    }

    // Re-compile the underlying formula
    this._formula = this.constructor.getFormula(this.terms);

    // Mark configuration as complete
    this.options.preprocessed = true;
  }

  /* -------------------------------------------- */

  /**
   * Apply optional modifiers which customize the behavior of the d20term.
   * @protected
   */
  configureDamage() {
    const flatBonus = new Map();
    for ( let [i, term] of this.terms.entries() ) {
      // Multiply dice terms
      if ( term instanceof DiceTerm ) {
        if ( term._number instanceof Roll ) {
          // Complex number term.
          if ( !term._number.isDeterministic ) continue;
          if ( !term._number._evaluated ) term._number.evaluateSync();
        }
        term.options.baseNumber = term.options.baseNumber ?? term.number; // Reset back
        term.number = term.options.baseNumber;
        if ( this.isCritical ) {
          let cm = this.options.criticalMultiplier ?? 2;

          // Powerful critical - maximize damage and reduce the multiplier by 1
          if ( this.options.powerfulCritical ) {
            const bonus = Roll.create(term.formula).evaluateSync({ maximize: true }).total ?? 0;
            if ( bonus > 0 ) {
              const flavor = term.flavor?.toLowerCase().trim() ?? game.i18n.localize("DND5E.PowerfulCritical");
              flatBonus.set(flavor, (flatBonus.get(flavor) ?? 0) + bonus);
            }
            cm = Math.max(1, cm-1);
          }

          // Alter the damage term
          let cb = (this.options.criticalBonusDice && (i === 0)) ? this.options.criticalBonusDice : 0;
          term.alter(cm, cb);
          term.options.critical = true;
        }
      }

      // Multiply numeric terms
      else if ( this.options.multiplyNumeric && (term instanceof NumericTerm) ) {
        term.options.baseNumber = term.options.baseNumber ?? term.number; // Reset back
        term.number = term.options.baseNumber;
        if ( this.isCritical ) {
          term.number *= (this.options.criticalMultiplier ?? 2);
          term.options.critical = true;
        }
      }
    }

    // Add powerful critical bonus
    if ( this.options.powerfulCritical && flatBonus.size ) {
      for ( const [type, number] of flatBonus.entries() ) {
        this.terms.push(new OperatorTerm({operator: "+"}));
        this.terms.push(new NumericTerm({number, options: {flavor: type}}));
      }
    }

    // Add extra critical damage term
    if ( this.isCritical && this.options.criticalBonusDamage ) {
      const extra = new Roll(this.options.criticalBonusDamage, this.data);
      if ( !(extra.terms[0] instanceof OperatorTerm) ) this.terms.push(new OperatorTerm({operator: "+"}));
      this.terms.push(...extra.terms);
    }

    // Re-compile the underlying formula
    this._formula = this.constructor.getFormula(this.terms);

    // Mark configuration as complete
    this.options.configured = true;
  }

  /* -------------------------------------------- */
  /*  Chat Messages                               */
  /* -------------------------------------------- */

  /** @inheritdoc */
  toMessage(messageData={}, options={}) {
    return this.constructor.toMessage([this], messageData, options);
  }

  /* -------------------------------------------- */

  /**
   * Transform a Roll instance into a ChatMessage, displaying the roll result.
   * This function can either create the ChatMessage directly, or return the data object that will be used to create.
   *
   * @param {DamageRoll[]} rolls             Rolls to add to the message.
   * @param {object} messageData             The data object to use when creating the message.
   * @param {options} [options]              Additional options which modify the created message.
   * @param {string} [options.rollMode]      The template roll mode to use for the message from CONFIG.Dice.rollModes.
   * @param {boolean} [options.create=true]  Whether to automatically create the chat message, or only return the
   *                                         prepared chatData object.
   * @returns {Promise<ChatMessage|object>}  A promise which resolves to the created ChatMessage document if create is
   *                                         true, or the Object of prepared chatData otherwise.
   */
  static async toMessage(rolls, messageData={}, {rollMode, create=true}={}) {
    rollMode = rolls.at(-1)?.options.rollMode ?? rollMode ?? game.settings.get("core", "rollMode");
    let isCritical = false;
    for ( const roll of rolls ) {
      if ( !roll._evaluated ) await roll.evaluate({ allowInteractive: rollMode !== CONST.DICE_ROLL_MODES.BLIND });
      messageData.flavor ??= roll.options.flavor;
      isCritical ||= roll.isCritical;
    }
    if ( isCritical ) {
      const label = game.i18n.localize("DND5E.CriticalHit");
      messageData.flavor = messageData.flavor ? `${messageData.flavor} (${label})` : label;
    }

    // Prepare chat data
    messageData = foundry.utils.mergeObject({
      user: game.user.id,
      sound: CONFIG.sounds.dice
    }, messageData);
    messageData.rolls = rolls;

    // Either create the message or just return the chat data
    const cls = getDocumentClass("ChatMessage");
    const msg = new cls(messageData);

    // Either create or return the data
    if ( create ) return cls.create(msg.toObject(), { rollMode });
    else {
      if ( rollMode ) msg.applyRollMode(rollMode);
      return msg.toObject();
    }
  }

  /* -------------------------------------------- */
  /*  Configuration Dialog                        */
  /* -------------------------------------------- */

  /**
   * Create a Dialog prompt used to configure evaluation of an existing D20Roll instance.
   * @param {object} data                     Dialog configuration data
   * @param {string} [data.title]               The title of the shown dialog window
   * @param {number} [data.defaultRollMode]     The roll mode that the roll mode select element should default to
   * @param {string} [data.defaultCritical]     Should critical be selected as default
   * @param {string} [data.template]            A custom path to an HTML template to use instead of the default
   * @param {boolean} [data.allowCritical=true] Allow critical hit to be chosen as a possible damage mode
   * @param {object} options                  Additional Dialog customization options
   * @returns {Promise<D20Roll|null>}         A resulting D20Roll object constructed with the dialog, or null if the
   *                                          dialog was closed
   */
  async configureDialog(data={}, options={}) {
    const rolls = await this.constructor.configureDialog([this], data, options);
    return rolls[0] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Create a Dialog prompt used to configure evaluation of one or more daamge rolls.
   * @param {DamageRoll[]} rolls                Damage rolls to configure.
   * @param {object} [data={}]                  Dialog configuration data
   * @param {string} [data.title]               The title of the shown dialog window
   * @param {number} [data.defaultRollMode]     The roll mode that the roll mode select element should default to
   * @param {string} [data.defaultCritical]     Should critical be selected as default
   * @param {string} [data.template]            A custom path to an HTML template to use instead of the default
   * @param {boolean} [data.allowCritical=true] Allow critical hit to be chosen as a possible damage mode
   * @param {object} options                    Additional Dialog customization options
   * @returns {Promise<D20Roll|null>}           A resulting D20Roll object constructed with the dialog, or null if the
   *                                            dialog was closed
   */
  static async configureDialog(rolls, {
    title, defaultRollMode, defaultCritical=false, template, allowCritical=true}={}, options={}) {

    // Render the Dialog inner HTML
    const content = await renderTemplate(template ?? this.EVALUATION_TEMPLATE, {
      formulas: rolls.map((roll, index) => ({
        formula: `${roll.formula}${index === 0 ? " + @bonus" : ""}`,
        type: CONFIG.DND5E.damageTypes[roll.options.type]?.label
          ?? CONFIG.DND5E.healingTypes[roll.options.type]?.label ?? null
      })),
      defaultRollMode,
      rollModes: CONFIG.Dice.rollModes
    });

    // Create the Dialog window and await submission of the form
    return new Promise(resolve => {
      new Dialog({
        title,
        content,
        buttons: {
          critical: {
            condition: allowCritical,
            label: game.i18n.localize("DND5E.CriticalHit"),
            callback: html => resolve(rolls.map((r, i) => r._onDialogSubmit(html, true, i === 0)))
          },
          normal: {
            label: game.i18n.localize(allowCritical ? "DND5E.Normal" : "DND5E.Roll"),
            callback: html => resolve(rolls.map((r, i) => r._onDialogSubmit(html, false, i === 0)))
          }
        },
        default: defaultCritical ? "critical" : "normal",
        close: () => resolve(null)
      }, options).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle submission of the Roll evaluation configuration Dialog
   * @param {jQuery} html         The submitted dialog content
   * @param {boolean} isCritical  Is the damage a critical hit?
   * @param {boolean} isFirst     Is this the first roll being prepared?
   * @returns {DamageRoll}        This damage roll.
   * @private
   */
  _onDialogSubmit(html, isCritical, isFirst) {
    const form = html[0].querySelector("form");

    // Append a situational bonus term
    if ( form.bonus.value && isFirst ) {
      const bonus = new DamageRoll(form.bonus.value, this.data);
      if ( !(bonus.terms[0] instanceof OperatorTerm) ) this.terms.push(new OperatorTerm({operator: "+"}));
      this.terms = this.terms.concat(bonus.terms);
    }

    // Apply advantage or disadvantage
    this.options.critical = isCritical;
    this.options.rollMode = form.rollMode.value;
    this.configureDamage();
    return this;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static fromData(data) {
    const roll = super.fromData(data);
    roll._formula = this.getFormula(roll.terms);
    return roll;
  }
}
