import DamageRollConfigurationDialog from "../applications/dice/damage-configuration-dialog.mjs";
import { areKeysPressed } from "../utils.mjs";
import BasicRoll from "./basic-roll.mjs";

const { DiceTerm, FunctionTerm, NumericTerm, OperatorTerm, ParentheticalTerm, StringTerm } = foundry.dice.terms;

/**
 * Configuration data for the process of rolling a damage roll.
 *
 * @typedef {BasicRollProcessConfiguration} DamageRollProcessConfiguration
 * @property {DamageRollConfiguration[]} rolls         Configuration data for individual rolls.
 * @property {CriticalDamageConfiguration} [critical]  Critical configuration for all rolls.
 * @property {boolean} [isCritical]                    Treat each roll as a critical unless otherwise specified.
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

/* -------------------------------------------- */

/**
 * A type of Roll specific to a damage (or healing) roll in the 5e system.
 * @param {string} formula                  The string formula to parse.
 * @param {object} data                     The data object against which to parse attributes within the formula.
 * @param {DamageRollOptions} [options={}]  Extra optional arguments which describe or modify the DamageRoll.
 */
export default class DamageRoll extends BasicRoll {
  constructor(formula, data, options) {
    super(formula, data, options);
    if ( !this.options.preprocessed ) this.preprocessFormula();
    if ( !this.options.configured ) this.configureDamage();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static DefaultConfigurationDialog = DamageRollConfigurationDialog;

  /* -------------------------------------------- */
  /*  Static Construction                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static fromConfig(config, process) {
    if ( process.critical ) {
      config = foundry.utils.deepClone(config);
      config.options ??= {};
      config.options.critical = foundry.utils.mergeObject(
        process.critical, config.options.critical ?? {}, { inplace: false }
      );
    }
    return super.fromConfig(config, process);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static async build(config={}, dialog={}, message={}) {
    config.critical ??= {};
    config.critical.multiplyNumeric ??= game.settings.get("dnd5e", "criticalDamageModifiers");
    config.critical.powerfulCritical ??= game.settings.get("dnd5e", "criticalDamageMaxDice");
    return super.build(config, dialog, message);
  }

  /* -------------------------------------------- */

  /** @override */
  static applyKeybindings(config, dialog, message) {
    const keys = {
      default: areKeysPressed(config.event, "skipDialogNormal"),
      normal: areKeysPressed(config.event, "skipDialogDisadvantage"),
      critical: areKeysPressed(config.event, "skipDialogAdvantage")
    };

    // Should the roll configuration dialog be displayed?
    dialog.configure ??= Object.values(keys).every(k => !k);

    // Determine critical mode
    config.isCritical ||= keys.critical;
    config.isCritical &&= !keys.normal;
    for ( const roll of config.rolls ) {
      roll.options ??= {};
      roll.options.isCritical ??= config.isCritical;
    }
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Is this damage critical.
   * @type {boolean}
   */
  get isCritical() {
    return this.options.isCritical === true;
  }

  /* -------------------------------------------- */
  /*  Roll Configuration                          */
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
    this.resetFormula();

    // Mark configuration as complete
    this.options.preprocessed = true;
  }

  /* -------------------------------------------- */

  /**
   * Apply optional modifiers which customize the behavior of the d20term.
   * @param {object} [options={}]
   * @param {CriticalDamageConfiguration} [options.critical={}]  Critical configuration to take into account, will be
   *                                                             superseded by the roll's configuration.
   * @protected
   */
  configureDamage({ critical={} }={}) {
    critical = foundry.utils.mergeObject(critical, this.options.critical ?? {}, { inplace: false });

    // Remove previous critical bonus damage
    this.terms = this.terms.filter(t => !t.options.criticalBonusDamage && !t.options.criticalFlatBonus);

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
          let cm = critical.multiplier ?? 2;

          // Powerful critical - maximize damage and reduce the multiplier by 1
          if ( critical.powerfulCritical ) {
            const bonus = Roll.create(term.formula).evaluateSync({ maximize: true }).total;
            if ( bonus > 0 ) {
              const flavor = term.flavor?.toLowerCase().trim() ?? game.i18n.localize("DND5E.PowerfulCritical");
              flatBonus.set(flavor, (flatBonus.get(flavor) ?? 0) + bonus);
            }
            cm = Math.max(1, cm-1);
          }

          // Alter the damage term
          let cb = (critical.bonusDice && (i === 0)) ? critical.bonusDice : 0;
          term.alter(cm, cb);
          term.options.critical = true;
        }
      }

      else if ( term instanceof NumericTerm ) {
        // Multiply numeric terms
        if ( critical.multiplyNumeric ) {
          term.options.baseNumber = term.options.baseNumber ?? term.number; // Reset back
          term.number = term.options.baseNumber;
          if ( this.isCritical ) {
            term.number *= (critical.multiplier ?? 2);
            term.options.critical = true;
          }
        }
      }
    }

    // Add powerful critical bonus
    if ( critical.powerfulCritical && flatBonus.size ) {
      for ( const [type, number] of flatBonus.entries() ) {
        this.terms.push(new OperatorTerm({ operator: "+", options: { criticalFlatBonus: true } }));
        this.terms.push(new NumericTerm({ number, options: { flavor: type, criticalFlatBonus: true } }));
      }
    }

    // Add extra critical damage term
    if ( this.isCritical && critical.bonusDamage ) {
      let extraTerms = new Roll(critical.bonusDamage, this.data).terms;
      if ( !(extraTerms[0] instanceof OperatorTerm) ) extraTerms.unshift(new OperatorTerm({ operator: "+" }));
      extraTerms.forEach(t => t.options.criticalBonusDamage = true);
      this.terms.push(...extraTerms);
    }

    // Re-compile the underlying formula
    this.resetFormula();

    // Mark configuration as complete
    this.options.configured = true;
  }
}
