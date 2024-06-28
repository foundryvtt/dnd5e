/**
 * Override and extend the basic roll implementation for the the 5e system.
 * @param {string} formula                       The string formula to parse
 * @param {object} data                          The data object against which to parse attributes within the formula
 * @param {object} [options={}]                  Extra optional arguments which describe or modify the roll5e
 */
export default class Roll5e extends Roll {

  /**
   * Create a Roll5e from a standard Roll instance.
   * @param {Roll} roll
   * @returns {DamageRoll}
   */
  static fromRoll(roll) {
    const newRoll = new this(roll.formula, roll.data, roll.options);
    Object.assign(newRoll, roll);
    return newRoll;
  }

  /* -------------------------------------------- */
  /*  Damage Roll Methods                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async evaluate({minimize=false, maximize=false, ...options}={}) {
    if ( "async" in options ) {
      if (options.async) delete options.async;
    }
    if ( !this._evaluated ) {
      if ( maximize ) this.replaceDieTermsMaximum(false);
      else if ( minimize ) this.replaceDieTermsMaximum(true);
    }
    if ( game.release.generation < 12 && !options.async) options.async = true;
    return super.evaluate(options);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  evaluateSync({minimize=false, maximize=false, ...options}={}) {
    if ( "async" in options ) {
      if ( options.async ) return this.evaluate(options);
      delete options.async;
    }
    if ( !this._evaluated ) {
      if ( maximize ) this.replaceDieTermsMaximum(false);
      else if ( minimize ) this.replaceDieTermsMaximum(true);
    }
    if ( game.release.generation < 12) return super.evaluate({ async: false, ...options });
    return super.evaluateSync(options);
  }

  /* -------------------------------------------- */

  /**
   * Replaces all dice terms with their maximum/minimum value.
   *
   * @param {boolean} minimum                Option to calculate the minimum value.
   * @returns {RollTerm[]}                   Returns the array of RollTerms.
   */

  replaceDieTermsMaximum(minimum = false) {
    this.terms = this.terms.map(term => {
      if (term instanceof DiceTerm) {
        return new NumericTerm({ number: Roll5e.calcTermMaximum(term, minimum), options: term.options });
      }
      return term;
    });
    return this.terms;
  }

  /* -------------------------------------------- */

  /**
   * Gets die information from passed die and calculates the maximum value that could be rolled.
   *
   * @param {DiceTerm} die                   DiceTerm to get the maximum/minimum value.
   * @param {boolean} minimum                Option to calculate the minimum value.
   * @returns {number}                       Maximum/Minimum value that could be rolled as an integer.
   */

  static calcTermMaximum(die, minimum = false) {
    let face = minimum ? 1 : die.faces;
    let number = die.number;
    const currentModifiers = foundry.utils.deepClone(die.modifiers);
    const validModifiers = {
      k: "keep",
      kh: "keep",
      kl: "keep",
      d: "drop",
      dh: "drop",
      dl: "drop",
      max: "maximum",
      min: "minimum"
    };

    for ( let modifier of currentModifiers ) {
      const rgx = /([Mm][AaIi][XxNn]|[KkDd][HhLl]?)([\d]+)?/i;
      const match = modifier.match(rgx);
      if ( !match ) continue;
      if (match && match[0].length < match.input.length) currentModifiers.push(match.input.slice(match[0].length));
      let [command, value] = match.slice(1);
      command = command.toLowerCase();
      const amount = parseInt(value) || (command === "max" || command === "min" ? -1 : 1);

      if (command in validModifiers && amount > 0 ) {
        if ( (command === "max" && minimum) || (command === "min" && !minimum) ) continue;
        else if ((command === "max" || command === "min") && amount >= 0 ) {
          face = amount > die.faces ? die.faces : amount;
        }
        else if ( Object.entries(validModifiers).reduce((arr, [k, v]) => {if (v === "keep") arr.push(k); return arr;}, []).includes(command) ) {
          number = amount < number ? amount : number;
        }
        else if ( Object.entries(validModifiers).reduce((arr, [k, v]) => {if (v === "drop") arr.push(k); return arr;}, []).includes(command) ) {
          number = number - amount < 1 ? 1 : number - amount;
        }
      }
    }

    return face * number;
  }

  /** @inheritdoc */
  static create(formula, data={}, options={}) {
    return Roll5e.fromRoll(super.create(formula, data, options));
  }

}
