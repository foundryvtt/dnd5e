/**
 * Object describing the hit dice for an actor.
 *
 * @param {Actor5e} actor
 */
export default class HitDice {
  constructor(actor) {
    /**
     * Store a reference to the actor.
     * @type {Actor5e}
     */
    this.actor = actor;

    /**
     * Remaining hit dice.
     * @type {number}
     */
    this.remaining = 0;

    /**
     * The actor's total amount of hit dice.
     * @type {number}
     */
    this.total = 0;

    /**
     * All valid die sizes derived from all classes.
     * @type {Set<number>}
     */
    this.sizes = new Set();

    /**
     * Store valid class items.
     * @type {Set<Item5e>}
     */
    this._classes = new Set();

    for (const item of Object.values(this.actor.classes)) {
      if ( /^d[0-9]+$/.test(item.system.hitDice) ) {
        this._classes.add(item);
        this.remaining += item.system.levels - item.system.hitDiceUsed;
        this.total += item.system.levels;
        this.sizes.add(parseInt(item.system.hitDice.replace("d", "")));
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * The smallest denomination.
   * @type {string}
   */
  get smallest() {
    return `d${this.smallestFace}`;
  }

  /* -------------------------------------------- */

  /**
   * The smallest die size.
   * @type {number}
   */
  get smallestFace() {
    return this.sizes.size ? Math.min(...this.sizes) : 0;
  }

  /* -------------------------------------------- */

  /**
   * The largest denomination.
   * @type {string}
   */
  get largest() {
    return `d${this.largestFace}`;
  }

  /* -------------------------------------------- */

  /**
   * The largest die size.
   * @type {number}
   */
  get largestFace() {
    return this.sizes.size ? Math.max(...this.sizes) : 0;
  }

  /* -------------------------------------------- */

  /**
   * The percentage of remaining hit dice.
   * @type {number}
   */
  get pct() {
    return Math.clamped(this.total ? (this.remaining / this.total) * 100 : 0, 0, 100);
  }

  /* -------------------------------------------- */

  /**
   * Alias for the remaining hit dice.
   * @type {number}
   */
  get value() {
    return this.remaining;
  }

  /* -------------------------------------------- */

  /**
   * Alias for the total amount of hit dice.
   * @type {number}
   */
  get max() {
    return this.total;
  }

  /* -------------------------------------------- */

  /**
   * Return an object of remaining hit dice categorized by size.
   * @returns {object}
   */
  get bySize() {
    const hd = {};
    this._classes.forEach(cls => {
      const d = cls.system.hitDice;
      const remaining = cls.system.levels - cls.system.hitDiceUsed;
      hd[d] = ( d in hd ) ? hd[d] + remaining : remaining;
    });
    return hd;
  }

  /* -------------------------------------------- */

  /**
   * Override the default `toString` method for backwards compatibility.
   * @returns {number}    Remaining hit dice.
   */
  toString() {
    return this.remaining;
  }

  /* -------------------------------------------- */

  /**
   * Create item updates for recovering hit dice during a rest.
   * @param {object} [options]
   * @param {number} [options.maxHitDice]   Maximum number of hit dice to recover.
   * @param {boolean} [options.largest]     Whether to restore the largest hit dice first.
   * @returns {object}                      Array of item updates and number of hit dice recovered.
   */
  createHitDiceUpdates({ maxHitDice, largest=true }={}) {
    if ( !Number.isInteger(maxHitDice) ) maxHitDice = Math.max(Math.floor(this.total / 2), 1);
    const classes = Array.from(this._classes).sort((a, b) => {
      a = parseInt(a.system.hitDice.replace("d", ""));
      b = parseInt(b.system.hitDice.replace("d", ""));
      return largest ? (b - a) : (a - b);
    });
    const updates = [];
    let recovered = 0;
    for ( const item of classes ) {
      const used = item.system.hitDiceUsed;
      if ( (recovered < maxHitDice) && (used > 0) ) {
        const delta = Math.min(used, maxHitDice - recovered);
        recovered += delta;
        updates.push({ _id: item.id, "system.hitDiceUsed": used - delta });
      }
    }
    return { updates, hitDiceRecovered: recovered };
  }
}
