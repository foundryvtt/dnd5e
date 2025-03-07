const {
  Coin, DiceTerm, Die, FunctionTerm, NumericTerm, OperatorTerm, ParentheticalTerm, RollTerm
} = foundry.dice.terms;

/**
 * A standardized helper function for simplifying the constant parts of a multipart roll formula.
 *
 * @param {string} formula                          The original roll formula.
 * @param {object} [options]                        Formatting options.
 * @param {boolean} [options.preserveFlavor=false]  Preserve flavor text in the simplified formula.
 * @param {boolean} [options.deterministic]         Strip any non-deterministic terms from the result.
 *
 * @returns {string}  The resulting simplified formula.
 */
export default function simplifyRollFormula(formula, { preserveFlavor=false, deterministic=false } = {}) {
  // Create a new roll and verify that the formula is valid before attempting simplification.
  let roll;
  try { roll = new Roll(formula); }
  catch(err) { console.warn(`Unable to simplify formula '${formula}': ${err}`); }
  Roll.validate(roll.formula);

  // Optionally strip flavor annotations.
  if ( !preserveFlavor ) roll.terms = Roll.parse(roll.formula.replace(RollTerm.FLAVOR_REGEXP, ""));

  if ( deterministic ) {
    // Perform arithmetic simplification to simplify parsing through the terms.
    roll.terms = _simplifyOperatorTerms(roll.terms);

    // Remove non-deterministic terms, their preceding operators, and dependent operators/terms.
    const terms = [];
    let temp = [];
    let multiplicative = false;
    let determ;

    for ( let i = roll.terms.length - 1; i >= 0; ) {
      let paren;
      let term = roll.terms[i];
      if ( term instanceof ParentheticalTerm ) {
        paren = simplifyRollFormula(term.term, { preserveFlavor, deterministic });
      }
      if ( Number.isNumeric(paren) ) {
        const termData = { number: paren };
        if ( preserveFlavor ) termData.options = { flavor: term.flavor };
        term = new NumericTerm(termData);
      }
      determ = term.isDeterministic && (!multiplicative || determ);
      if ( determ ) temp.unshift(term);
      else temp = [];
      term = roll.terms[--i];
      while ( term instanceof OperatorTerm ) {
        if ( determ ) temp.unshift(term);
        if ( (term.operator === "*") || (term.operator === "/") || (term.operator === "%") ) multiplicative = true;
        else {
          multiplicative = false;
          while ( temp.length ) terms.unshift(temp.pop());
        }
        term = roll.terms[--i];
      }
    }
    if ( determ ) {
      while ( temp.length ) terms.unshift(temp.pop());
    }
    roll.terms = terms;
  }

  // Perform arithmetic simplification on the existing roll terms.
  roll.terms = _simplifyOperatorTerms(roll.terms);

  // If the formula contains multiplication or division we cannot easily simplify
  if ( /[*/]/.test(roll.formula) ) {
    if ( roll.isDeterministic && !/d\(/.test(roll.formula) && (!/\[/.test(roll.formula) || !preserveFlavor) ) {
      return String(new Roll(roll.formula).evaluateSync().total);
    }
    else return roll.constructor.getFormula(roll.terms);
  }

  // Flatten the roll formula and eliminate string terms.
  roll.terms = _expandParentheticalTerms(roll.terms);
  roll.terms = Roll.simplifyTerms(roll.terms);

  // Group terms by type and perform simplifications on various types of roll term.
  let { poolTerms, diceTerms, mathTerms, numericTerms } = _groupTermsByType(roll.terms);
  numericTerms = _simplifyNumericTerms(numericTerms ?? []);
  diceTerms = _simplifyDiceTerms(diceTerms ?? []);

  // Recombine the terms into a single term array and remove an initial + operator if present.
  const simplifiedTerms = [diceTerms, poolTerms, mathTerms, numericTerms].flat().filter(Boolean);
  if ( simplifiedTerms[0]?.operator === "+" ) simplifiedTerms.shift();
  return roll.constructor.getFormula(simplifiedTerms);
}

/* -------------------------------------------- */

/**
 * A helper function to perform arithmetic simplification and remove redundant operator terms.
 * @param {RollTerm[]} terms  An array of roll terms.
 * @returns {RollTerm[]}      A new array of roll terms with redundant operators removed.
 */
function _simplifyOperatorTerms(terms) {
  return terms.reduce((acc, term) => {
    const prior = acc[acc.length - 1];
    const ops = new Set([prior?.operator, term.operator]);

    // If one of the terms is not an operator, add the current term as is.
    if ( ops.has(undefined) ) acc.push(term);

    // Replace consecutive "+ -" operators with a "-" operator.
    else if ( (ops.has("+")) && (ops.has("-")) ) acc.splice(-1, 1, new OperatorTerm({ operator: "-" }));

    // Replace double "-" operators with a "+" operator.
    else if ( (ops.has("-")) && (ops.size === 1) ) acc.splice(-1, 1, new OperatorTerm({ operator: "+" }));

    // Don't include "+" operators that directly follow "+", "*", or "/". Otherwise, add the term as is.
    else if ( !ops.has("+") ) acc.push(term);

    return acc;
  }, []);
}

/* -------------------------------------------- */

/**
 * A helper function for combining unannotated numeric terms in an array into a single numeric term.
 * @param {object[]} terms  An array of roll terms.
 * @returns {object[]}      A new array of terms with unannotated numeric terms combined into one.
 */
function _simplifyNumericTerms(terms) {
  const simplified = [];
  const { annotated, unannotated } = _separateAnnotatedTerms(terms);

  // Combine the unannotated numerical bonuses into a single new NumericTerm.
  if ( unannotated.length ) {
    const staticBonus = Roll.safeEval(Roll.getFormula(unannotated));
    if ( staticBonus === 0 ) return [...annotated];

    // If the staticBonus is greater than 0, add a "+" operator so the formula remains valid.
    simplified.push(new OperatorTerm({ operator: staticBonus < 0 ? "-" : "+" }));
    simplified.push(new NumericTerm({ number: Math.abs(staticBonus) }));
  }
  return [...simplified, ...annotated];
}

/* -------------------------------------------- */

/**
 * A helper function to group dice of the same size and sign into single dice terms.
 * @param {object[]} terms  An array of DiceTerms and associated OperatorTerms.
 * @returns {object[]}      A new array of simplified dice terms.
 */
function _simplifyDiceTerms(terms) {
  const { annotated, unannotated } = _separateAnnotatedTerms(terms);

  // Split the unannotated terms into different die sizes and signs
  const diceQuantities = unannotated.reduce((obj, curr, i) => {
    if ( curr instanceof OperatorTerm ) return obj;
    const isCoin = curr.constructor?.name === "Coin";
    const face = isCoin ? "c" : curr.faces;
    const modifiers = isCoin ? "" : curr.modifiers.filterJoin("");
    const key = `${unannotated[i - 1].operator}${face}${modifiers}`;
    obj[key] ??= {};
    if ( (curr._number instanceof Roll) && (curr._number.isDeterministic) ) curr._number.evaluateSync();
    obj[key].number = (obj[key].number ?? 0) + curr.number;
    if ( !isCoin ) obj[key].modifiers = (obj[key].modifiers ?? []).concat(curr.modifiers);
    return obj;
  }, {});

  // Add new die and operator terms to simplified for each die size and sign
  const simplified = Object.entries(diceQuantities).flatMap(([key, {number, modifiers}]) => ([
    new OperatorTerm({ operator: key.charAt(0) }),
    key.slice(1) === "c"
      ? new Coin({ number: number })
      : new Die({ number, faces: parseInt(key.slice(1)), modifiers: [...new Set(modifiers)] })
  ]));
  return [...simplified, ...annotated];
}

/* -------------------------------------------- */

/**
 * A helper function to extract the contents of parenthetical terms into their own terms.
 * @param {object[]} terms  An array of roll terms.
 * @returns {object[]}      A new array of terms with no parenthetical terms.
 */
function _expandParentheticalTerms(terms) {
  terms = terms.reduce((acc, term) => {
    if ( term instanceof ParentheticalTerm ) {
      if ( term.isDeterministic ) {
        const roll = new Roll(term.term);
        term = new NumericTerm({ number: roll.evaluateSync().total });
      } else {
        const subterms = new Roll(term.term).terms;
        term = _expandParentheticalTerms(subterms);
      }
    }
    acc.push(term);
    return acc;
  }, []);
  return _simplifyOperatorTerms(terms.flat());
}

/* -------------------------------------------- */

/**
 * A helper function to group terms into PoolTerms, DiceTerms, FunctionTerms, and NumericTerms.
 * FunctionTerms are included as NumericTerms if they are deterministic.
 * @param {RollTerm[]} terms  An array of roll terms.
 * @returns {object}          An object mapping term types to arrays containing roll terms of that type.
 */
function _groupTermsByType(terms) {
  // Add an initial operator so that terms can be rearranged arbitrarily.
  if ( !(terms[0] instanceof OperatorTerm) ) terms.unshift(new OperatorTerm({ operator: "+" }));

  return terms.reduce((obj, term, i) => {
    let type;
    if ( term instanceof DiceTerm ) type = DiceTerm;
    else if ( (term instanceof FunctionTerm) && (term.isDeterministic) ) type = NumericTerm;
    else type = term.constructor;
    const key = `${type.name.charAt(0).toLowerCase()}${type.name.substring(1)}s`;

    // Push the term and the preceding OperatorTerm.
    (obj[key] = obj[key] ?? []).push(terms[i - 1], term);
    return obj;
  }, {});
}

/* -------------------------------------------- */

/**
 * A helper function to separate annotated terms from unannotated terms.
 * @param {object[]} terms     An array of DiceTerms and associated OperatorTerms.
 * @returns {Array | Array[]}  A pair of term arrays, one containing annotated terms.
 */
function _separateAnnotatedTerms(terms) {
  return terms.reduce((obj, curr, i) => {
    if ( curr instanceof OperatorTerm ) return obj;
    obj[curr.flavor ? "annotated" : "unannotated"].push(terms[i - 1], curr);
    return obj;
  }, { annotated: [], unannotated: [] });
}
