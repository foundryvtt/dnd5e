/**
 * Object describing the hit dice for an actor.
 */
export default class HitDice {
  /**
   * Object describing the hit dice for an actor.
   * @param {Actor5e} actor     The actor whose hit dice this document describes.
   */
  constructor(actor) {
    this.actor = actor;

    for ( const item of Object.values(actor.classes) ) {
      if ( /^d\d+$/.test(item.system.hitDice) ) {
        this.classes.add(item);
        this.value += item.system.levels - item.system.hitDiceUsed;
        this.max += item.system.levels;
        this.sizes.add(parseInt(item.system.hitDice.slice(1)));
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Store a reference to the actor.
   * @type {Actor5e}
   */
  actor = null;

  /* -------------------------------------------- */

  /**
   * Remaining hit dice.
   * @type {number}
   */
  value = 0;

  /* -------------------------------------------- */

  /**
   * The actor's total amount of hit dice.
   * @type {number}
   */
  max = 0;

  /* -------------------------------------------- */

  /**
   * All valid die sizes derived from all classes.
   * @type {Set<number>}
   */
  sizes = new Set();

  /* -------------------------------------------- */

  /**
   * Store valid class items.
   * @type {Set<Item5e>}
   */
  classes = new Set();

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
   * The smallest die size of those available.
   * @type {string}
   */
  get smallestAvailable() {
    const bySize = this.bySize;
    for ( const faces of Array.from(this.sizes).sort((a, b) => a - b) ) {
      if ( bySize[`d${faces}`] ) return `d${faces}`;
    }
    return "d0";
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
   * The largest die size of those available.
   * @type {string}
   */
  get largestAvailable() {
    const bySize = this.bySize;
    for ( const faces of Array.from(this.sizes).sort((a, b) => b - a) ) {
      if ( bySize[`d${faces}`] ) return `d${faces}`;
    }
    return "d0";
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
    return Math.clamp(this.max ? (this.value / this.max) * 100 : 0, 0, 100);
  }

  /* -------------------------------------------- */

  /**
   * Return an object of remaining hit dice categorized by size.
   * @returns {object}
   */
  get bySize() {
    const hd = {};
    this.classes.forEach(cls => {
      const d = cls.system.hitDice;
      const remaining = cls.system.levels - cls.system.hitDiceUsed;
      hd[d] = (hd[d] ?? 0) + remaining;
    });
    return hd;
  }

  /* -------------------------------------------- */

  /**
   * Override the default `toString` method for backwards compatibility.
   * @returns {number}    Remaining hit dice.
   */
  toString() {
    return this.value;
  }

  /* -------------------------------------------- */

  /**
   * Create item updates for recovering hit dice during a rest.
   * @param {object} [options]
   * @param {number} [options.maxHitDice]                       Maximum number of hit dice to recover.
   * @param {number} [options.fraction=0.5]                     Fraction of max hit dice to recover. Only used if
   *                                                            `maxHitDice` isn't specified.
   * @param {boolean} [options.largest]                         Whether to restore the largest hit dice first.
   * @returns {{updates: object[], hitDiceRecovered: number}}   Array of item updates and number of hit dice recovered.
   */
  createHitDiceUpdates({ maxHitDice, fraction=0.5, largest=true }={}) {
    if ( !Number.isInteger(maxHitDice) ) maxHitDice = Math.max(Math.floor(this.max * fraction), 1);
    const classes = Array.from(this.classes).sort((a, b) => {
      a = parseInt(a.system.hitDice.slice(1));
      b = parseInt(b.system.hitDice.slice(1));
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
