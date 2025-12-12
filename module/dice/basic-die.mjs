const { DiceTerm, Die } = foundry.dice.terms;

/**
 * Add support for system-specific modifiers to the base die.
 */
export default class BasicDie extends Die {
  /** @inheritDoc */
  static MODIFIERS = {
    ...super.MODIFIERS,
    adv: "advantage",
    dis: "advantage"
  };

  /* -------------------------------------------- */
  /*  Term Modifiers                              */
  /* -------------------------------------------- */

  /**
   * Handle rolling advantage and disadvantage for a die.
   * @param {string} modifier        The matched modifier query.
   * @returns {Promise<false|void>}  False if modifier was unmatched.
   */
  async advantage(modifier) {
    const match = modifier.match(/\w{3}(\d+)?/i);
    const count = parseInt(match[1] ?? 1);
    const adv = modifier.startsWith("a");

    // Roll die again up to the count required
    const rollCount = count * this.number;
    for ( let i=0; i<rollCount; i++ ) await this.roll();

    // Partition results based on count
    const sets = Array(count + 1);
    const sliceSize = this.results.length / sets.length;
    let targetTotal = adv ? -Infinity : Infinity;
    for ( const index of sets.keys() ) {
      const startIndex = sliceSize * index;
      sets[index] = { results: this.results.slice(startIndex, startIndex + sliceSize) };
      sets[index].total = sets[index].results.reduce((total, { result }) => total + result, 0);
      targetTotal = Math[adv ? "max" : "min"](targetTotal, sets[index].total);
    }

    // Discard any results not included in the selected set
    let kept = false;
    for ( const { results, total } of sets ) {
      if ( !kept && (total === targetTotal) ) kept = true;
      else results.forEach(r => {
        r.discarded = true;
        r.active = false;
      });
    }
  }
}
