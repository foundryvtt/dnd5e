import DamageRollConfigurationDialog from "../applications/dice/damage-configuration-dialog.mjs";
import { areKeysPressed } from "../utils.mjs";
import BasicRoll from "./basic-roll.mjs";

const { DiceTerm, NumericTerm, OperatorTerm, ParentheticalTerm, RollTerm } = foundry.dice.terms;

/**
 * @import { CriticalDamageConfiguration, DamageRollOptions } from "./_types.mjs";
 */

/**
 * A type of Roll specific to a damage (or healing) roll in the 5e system.
 * @extends {BasicRoll}
 */
export default class DamageRoll extends BasicRoll {
  /**
   * @param {string} formula                  The string formula to parse.
   * @param {object} data                     The data object against which to parse attributes within the formula.
   * @param {DamageRollOptions} [options={}]  Extra optional arguments which describe or modify the DamageRoll.
   */
  constructor(formula, data, options) {
    super(formula, data, options);
    if ( !this.options.preprocessed ) this.preprocessFormula();
    if ( !this.options.configured ) this.configureDamage();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static DefaultConfigurationDialog = DamageRollConfigurationDialog;

  /* -------------------------------------------- */

  /**
   * Operators that bind more strongly than additive operators.
   * @type {Set<string>}
   */
  static #BINDING_OPERATORS = new Set(["*", "/", "%"]);

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
   * Perform any preprocessing of the roll's terms required before critical damage is configured..
   * @protected
   */
  preprocessFormula() {
    // Re-compile the underlying formula
    this.resetFormula();

    // Mark preprocessing as complete
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
    // Critical scaling is destructive and applied exactly once. The damage dialog re-builds rolls from configuration
    // rather than re-running this method, so a second call (e.g. from external code) is a no-op rather than a
    // double-application.
    if ( this.options.configured ) return;
    critical = foundry.utils.mergeObject(critical, this.options.critical ?? {}, { inplace: false });

    if ( this.isCritical ) {
      const newTerms = [];
      for ( const [i, term] of this.terms.entries() ) {
        if ( term instanceof OperatorTerm ) newTerms.push(term);
        else newTerms.push(...this.#applyCriticalTerm(term, critical, i));
      }

      // Add extra, unmodified critical damage.
      if ( critical.bonusDamage ) {
        const bonusTerms = new Roll(critical.bonusDamage, this.data).terms;
        if ( !(bonusTerms[0] instanceof OperatorTerm) ) newTerms.push(new OperatorTerm({ operator: "+" }));
        newTerms.push(...bonusTerms);
      }

      this.terms = newTerms;
    }

    // Re-compile the underlying formula
    this.resetFormula();

    // Mark configuration as complete
    this.options.configured = true;
  }

  /* -------------------------------------------- */

  /**
   * Apply critical scaling to a single non-operator term, mutating it in place where possible and returning the
   * term(s) that should occupy its slot.
   * @param {RollTerm} term                          The term to scale.
   * @param {CriticalDamageConfiguration} critical   The resolved critical configuration.
   * @param {number} index                           Index of the term within this.terms.
   * @returns {RollTerm[]}                           The term, plus any copies or bonuses added alongside it.
   */
  #applyCriticalTerm(term, critical, index) {
    // If a dice term's count is itself a roll, flatten a deterministic one to a plain integer so it scales and clones
    // cleanly. A random count is left as a roll: a plain die falls through to alter(), which multiplies the count roll
    // in place (rolled once, then doubled), and a modified die is left untouched, since duplicating it would need the
    // rolled count shared across the copies, which cannot be done synchronously.
    if ( (term instanceof DiceTerm) && (term._number instanceof Roll) ) {
      if ( term._number.isDeterministic ) term.number = term._number.evaluateSync().total;
      else if ( term.modifiers.length ) return [term];
    }

    term.options.critical = true;

    // Numeric terms are only multiplied when configured to do so.
    if ( term instanceof NumericTerm ) {
      if ( critical.multiplyNumeric ) term.number *= (critical.multiplier ?? 2);
      return [term];
    }

    const cm = critical.multiplier ?? 2;
    const cb = (critical.bonusDice && !index) ? critical.bonusDice : 0;

    // Powerful critical replaces the extra dice with their maximized value, added as a flat bonus.
    if ( critical.powerfulCritical ) {
      const bonus = Roll.create(term.formula).evaluateSync({ maximize: true }).total * (Math.max(1, cm - 1) + cb);
      if ( bonus <= 0 ) return [term];
      const flavor = term.flavor?.toLowerCase().trim() ?? _loc("DND5E.PowerfulCritical");
      return this.#placeCritical(term, [new NumericTerm({ number: bonus, options: { flavor } })], index);
    }

    // For RAW criticals without modifiers we can double the dice with alter.
    if ( (term instanceof DiceTerm) && !term.modifiers.length ) {
      term.alter(cm, cb);
      return [term];
    }

    // Modified or complex terms are duplicated and placed via #placeCritical.
    const copies = (cm - 1) + cb;
    if ( !term.isDeterministic && (copies > 0) ) {
      const clones = Array.from({ length: copies }, () => RollTerm.fromData(foundry.utils.deepClone(term.toJSON())));
      return this.#placeCritical(term, clones, index);
    }

    return [term];
  }

  /* -------------------------------------------- */

  /**
   * Position a critical term together with its extra copies or bonuses. Additive terms are spliced inline carrying the
   * term's sign, and a term bound by a higher-precedence operator (*, /, %) is wrapped in a parenthetical so that
   * operator applies to the whole group. The shared damage type is carried onto any wrapper because chunkTerms does
   * not introspect parentheticals.
   * @param {RollTerm} term      The original critical term.
   * @param {RollTerm[]} extras  Additional copies or bonus terms to place alongside it.
   * @param {number} index       Index of the term within this.terms.
   * @returns {RollTerm[]}       The terms that should occupy the original term's slot.
   */
  #placeCritical(term, extras, index) {
    const bound = t => (t instanceof OperatorTerm) && DamageRoll.#BINDING_OPERATORS.has(t.operator);
    const prev = this.terms[index - 1];
    const next = this.terms[index + 1];

    // Case 1 - Bound by a higher-precedence operator. Wrap so it applies to the whole group. The wrapper is the
    // canonical carrier of the group's damage type (chunkTerms reads it there, as it does not recurse into
    // parentheticals), so move the term's options onto the wrapper and clear the inner flavors to avoid ugly display.
    if ( bound(prev) || bound(next) ) {
      const options = foundry.utils.deepClone(term.options);
      const group = [term];
      for ( const extra of extras ) group.push(new OperatorTerm({ operator: "+" }), extra);
      for ( const t of group ) t.options.flavor = "";
      return [ParentheticalTerm.fromTerms(group, options)];
    }

    // Case 2 - Additive. Splice inline, carrying the term's sign.
    const sign = (prev instanceof OperatorTerm) ? prev.operator : "+";
    const placed = [term];
    for ( const extra of extras ) placed.push(new OperatorTerm({ operator: sign }), extra);
    return placed;
  }
}
