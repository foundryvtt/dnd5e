/**
 * @typedef {StringFieldOptions} FormulaFieldOptions
 * @property {boolean} [deterministic=false]  Is this formula not allowed to have dice values?
 */

/**
 * Special case StringField which represents a formula.
 *
 * @param {FormulaFieldOptions} [options={}]  Options which configure the behavior of the field.
 * @property {boolean} deterministic=false    Is this formula not allowed to have dice values?
 */
export default class FormulaField extends foundry.data.fields.StringField {

  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      deterministic: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _validateType(value) {
    Roll.validate(value);
    if ( this.options.deterministic ) {
      const roll = new Roll(value);
      if ( !roll.isDeterministic ) throw new Error("must not contain dice terms");
    }
    super._validateType(value);
  }

  /* -------------------------------------------- */
  /*  Active Effect Integration                   */
  /* -------------------------------------------- */

  /** @override */
  _castChangeDelta(delta) {
    return this._cast(delta).trim();
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeAdd(value, delta, model, change) {
    if ( !value ) return delta;
    const operator = delta.startsWith("-") ? "-" : "+";
    delta = delta.replace(/^[+-]/, "").trim();
    return `${value} ${operator} ${delta}`;
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeMultiply(value, delta, model, change) {
    if ( !value ) return delta;
    const terms = new Roll(value).terms;
    if ( terms.length > 1 ) return `(${value}) * ${delta}`;
    return `${value} * ${delta}`;
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeUpgrade(value, delta, model, change) {
    if ( !value ) return delta;
    const terms = new Roll(value).terms;
    if ( (terms.length === 1) && (terms[0].fn === "max") ) return current.replace(/\)$/, `, ${delta})`);
    return `max(${value}, ${delta})`;
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeDowngrade(value, delta, model, change) {
    if ( !value ) return delta;
    const terms = new Roll(value).terms;
    if ( (terms.length === 1) && (terms[0].fn === "min") ) return current.replace(/\)$/, `, ${delta})`);
    return `min(${value}, ${delta})`;
  }
}

