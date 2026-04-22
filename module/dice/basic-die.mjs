const { Die } = foundry.dice.terms;

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
   * Handle rolling advantage and disadvantage for a die. The extra rolls have already been performed by the main roll
   * loop (pre-expansion inflated the dice count before the resolver opened), so this handler just partitions results
   * into count + 1 sets of size, keeps the set with the best (adv) or worst (dis) total, and discards the others.
   * @param {string} modifier  The matched modifier query.
   */
  async advantage(modifier) {
    const expansion = this.options.pending?.advantage;
    if ( !expansion ) return;
    const { count, adv, size } = expansion;
    const sets = Array(count + 1);
    let targetTotal = adv ? -Infinity : Infinity;
    for ( const index of sets.keys() ) {
      const startIndex = size * index;
      sets[index] = { results: this.results.slice(startIndex, startIndex + size) };
      sets[index].total = sets[index].results.reduce((total, { result }) => total + result, 0);
      targetTotal = Math[adv ? "max" : "min"](targetTotal, sets[index].total);
    }
    let kept = false;
    for ( const { results, total } of sets ) {
      if ( !kept && (total === targetTotal) ) kept = true;
      else results.forEach(r => {
        r.discarded = true;
        r.active = false;
      });
    }
    delete this.options.pending.advantage;
  }

  /* -------------------------------------------- */

  /**
   * Pre-expand any adv/dis modifier on this term so that the resolver sees the final dice count up-front. Multiplies
   * _number by count + 1 and stashes partition data in options.pending.advantage for the advantage handler to consume.
   * No-op for complex terms that have a Roll for a number.
   */
  expandAdvantage() {
    if ( this.options.pending?.advantage ) return;
    if ( typeof this.number !== "number" ) return;
    let match;
    for ( const modifier of this.modifiers ) {
      match = modifier.match(/^(adv|dis)(\d*)/i);
      if ( match ) break;
    }
    if ( !match ) return;
    let [, token, count] = match;
    count = parseInt(count || 1);
    const adv = token.toLowerCase() === "adv";
    const size = this.number;
    this._number = (count + 1) * size;
    this.options.pending ??= {};
    this.options.pending.advantage = { adv, count, size };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _evaluateAsync(options={}) {
    // Have to duplicate most of the core code here in order to insert advantage expansion at the point where we have
    // the evaluated complex number term but before the terms are passed back to the resolver.
    for ( const roll of [this._faces, this._number] ) {
      if ( !(roll instanceof foundry.dice.Roll) ) continue;
      if ( this._root ) roll._root = this._root;
      await roll.evaluate(options);
    }
    if ( Math.abs(this.number) > 999 ) {
      throw new Error("You may not evaluate a DiceTerm with more than 999 requested results");
    }
    this.expandAdvantage();
    if ( this.resolver && !this._id ) await this.resolver.addTerm(this);
    for ( let n = this.results.length; n < Math.abs(this.number); n++ ) await this.roll(options);
    await this._evaluateModifiers();
    return this;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _evaluateModifiers() {
    // Since adv/dis internally calls roll and modifies the count, they must be evaluated first in order for subsequent
    // modifiers to operate on the correct dice.
    const [rest, selection] = this.modifiers.partition(m => /^(adv|dis)\d*/i.test(m));
    if ( selection.length ) this.modifiers = selection.concat(rest);
    return super._evaluateModifiers();
  }
}
