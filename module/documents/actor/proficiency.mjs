/**
 * Object describing the proficiency for a specific ability or skill.
 *
 * @param {number} proficiency   Actor's flat proficiency bonus based on their current level.
 * @param {number} multiplier    Value by which to multiply the actor's base proficiency value.
 * @param {boolean} [roundDown]  Should half-values be rounded up or down?
 */
export default class Proficiency {
  constructor(proficiency, multiplier, roundDown=true) {

    /**
     * Base proficiency value of the actor.
     * @type {number}
     * @private
     */
    this._baseProficiency = Number(proficiency ?? 0);

    /**
     * Value by which to multiply the actor's base proficiency value.
     * @type {number}
     */
    this.multiplier = Number(multiplier ?? 0);

    /**
     * Direction decimal results should be rounded ("up" or "down").
     * @type {string}
     */
    this.rounding = roundDown ? "down" : "up";
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Should only deterministic proficiency be returned, regardless of system settings?
   * @type {boolean}
   */
  deterministic = false;

  /* -------------------------------------------- */

  /**
   * Flat proficiency value regardless of proficiency mode.
   * @type {number}
   */
  get flat() {
    const roundMethod = (this.rounding === "down") ? Math.floor : Math.ceil;
    return roundMethod(this.multiplier * this._baseProficiency);
  }

  /* -------------------------------------------- */

  /**
   * Dice-based proficiency value regardless of proficiency mode.
   * @type {string}
   */
  get dice() {
    if ( (this._baseProficiency === 0) || (this.multiplier === 0) ) return "0";
    const roundTerm = (this.rounding === "down") ? "floor" : "ceil";
    if ( this.multiplier === 0.5 ) {
      return `${roundTerm}(1d${this._baseProficiency * 2} / 2)`;
    } else {
      return `${this.multiplier}d${this._baseProficiency * 2}`;
    }
  }

  /* -------------------------------------------- */

  /**
   * Either flat or dice proficiency term based on configured setting.
   * @type {string}
   */
  get term() {
    return (game.settings.get("dnd5e", "proficiencyModifier") === "dice") && !this.deterministic
      ? this.dice : String(this.flat);
  }

  /* -------------------------------------------- */

  /**
   * Whether the proficiency is greater than zero.
   * @type {boolean}
   */
  get hasProficiency() {
    return (this._baseProficiency > 0) && (this.multiplier > 0);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Calculate an actor's proficiency modifier based on level or CR.
   * @param {number} level  Level or CR To use for calculating proficiency modifier.
   * @returns {number}      Proficiency modifier.
   */
  static calculateMod(level) {
    return Math.floor((level + 7) / 4);
  }

  /* -------------------------------------------- */

  /**
   * Return a clone of this proficiency with any changes applied.
   * @param {object} [updates={}]
   * @param {number} updates.proficiency  Actor's flat proficiency bonus based on their current level.
   * @param {number} updates.multiplier   Value by which to multiply the actor's base proficiency value.
   * @param {boolean} updates.roundDown   Should half-values be rounded up or down?
   * @returns {Proficiency}
   */
  clone({ proficiency, multiplier, roundDown }={}) {
    proficiency ??= this._baseProficiency;
    multiplier ??= this.multiplier;
    roundDown ??= this.rounding === "down";
    return new this.constructor(proficiency, multiplier, roundDown);
  }

  /* -------------------------------------------- */

  /**
   * Override the default `toString` method to return flat proficiency for backwards compatibility in formula.
   * @returns {string}  Either flat or dice proficiency term based on configured setting.
   */
  toString() {
    return this.term;
  }
}
