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
      this.classes.add(item);
      this.sizes.add(parseInt(item.system.hd.denomination.slice(1)));
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
  get value() {
    if ( this.#value !== undefined ) return this.#value;
    this.#value = this.classes.reduce((acc, cls) => acc + cls.system.hd.value, 0);
    return this.#value;
  }

  #value;

  /* -------------------------------------------- */

  /**
   * The actor's total amount of hit dice.
   * @type {number}
   */
  get max() {
    if ( this.#max !== undefined ) return this.#max;
    this.#max = this.classes.reduce((acc, cls) => acc + cls.system.hd.max, 0);
    return this.#max;
  }

  #max;

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
      const d = cls.system.hd.denomination;
      hd[d] = (hd[d] ?? 0) + cls.system.hd.value;
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
   * @param {RestConfiguration} [config]
   * @param {number} [config.maxHitDice]    Maximum number of hit dice to recover.
   * @param {number} [config.fraction=0.5]  Fraction of max hit dice to recover. Only used if
   *                                        `maxHitDice` isn't specified.
   * @param {boolean} [config.largest]      Whether to restore the largest hit dice first.
   * @param {RestResult} [result={}]        Rest result being constructed.
   */
  createHitDiceUpdates({ maxHitDice, fraction=0.5, largest=true, ...config }={}, result={}) {
    if ( !Number.isInteger(maxHitDice) ) maxHitDice = Math.max(Math.floor(this.max * fraction), 1);
    const classes = Array.from(this.classes).sort((lhs, rhs) => {
      const sort = lhs.system.hd.denomination.localeCompare(rhs.system.hd.denomination, "en", { numeric: true });
      return largest ? sort * -1 : sort;
    });
    const updateItems = [];
    let recovered = 0;
    for ( const item of classes ) {
      const used = item.system.hd.spent;
      if ( (recovered < maxHitDice) && (used > 0) ) {
        const delta = Math.min(used, maxHitDice - recovered);
        recovered += delta;
        updateItems.push({ _id: item.id, "system.hd.spent": used - delta });
      }
    }
    foundry.utils.mergeObject(result, {
      deltas: {
        hitDice: (result?.deltas?.hitDice ?? 0) + recovered
      },
      updateItems
    });
  }
}
