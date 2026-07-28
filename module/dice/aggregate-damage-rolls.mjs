const { DiceTerm, NumericTerm, OperatorTerm, PoolTerm, RollTerm } = foundry.dice.terms;

/**
 * @import { DamageBreakdown } from "./_types.mjs";
 */

/**
 * Pool term result classes.
 * @type {string[]}
 */
const TERM_RESULT_CLASSES = ["success", "failure", "rerolled", "exploded", "discarded"];

/**
 * Parse the provided rolls, splitting parts based on damage types & properties, taking flavor into account.
 * @param {DamageRoll[]} rolls                   Damage rolls to aggregate.
 * @param {object} [options={}]
 * @param {boolean} [options.respectProperties]  Should damage properties also affect grouping?
 * @returns {DamageRoll[]}
 */
export default function aggregateDamageRolls(rolls, { respectProperties }={}) {
  const makeHash = (type, properties=[]) => [type, ...(respectProperties ? Array.from(properties).sort() : [])].join();

  // Split rolls into new sets of terms based on damage type & properties
  const types = new Map();
  for ( const roll of rolls ) {
    for ( const chunk of chunkTerms(roll.terms, roll.options.type) ) {
      const key = makeHash(chunk.type, roll.options.properties);
      if ( !types.has(key) ) types.set(key, { type: chunk.type, properties: new Set(), terms: [] });
      const data = types.get(key);
      data.terms.push(new OperatorTerm({ operator: chunk.negative ? "-" : "+" }), ...chunk.terms);
      if ( roll.options.properties ) data.properties = data.properties.union(new Set(roll.options.properties));
    }
  }

  // Create new damage rolls based on the aggregated terms
  const newRolls = [];
  for ( const { terms, type, properties } of types.values() ) {
    newRolls.push(CONFIG.Dice.DamageRoll.fromTerms(terms, { type, properties: Array.from(properties) }));
  }

  return newRolls;
}

/* -------------------------------------------- */

/**
 * Collect a roll's dice results and its deterministic remainder into a single breakdown.
 * @param {Roll} roll  The roll to aggregate.
 * @returns {DamageBreakdown}
 */
export function aggregateDamageTerms(roll) {
  const aggregate = {
    type: roll.options.type, total: Math.max(0, roll.total), constant: 0, dice: [], icon: null, method: null
  };
  let hasMultiplication = false;
  for ( let i = roll.terms.length - 1; i >= 0; ) {
    const term = roll.terms[i--];
    if ( !(term instanceof NumericTerm) && !(term instanceof DiceTerm) && !(term instanceof PoolTerm) ) {
      continue;
    }
    const value = term.total;
    if ( term instanceof DiceTerm ) {
      const tooltipData = term.getTooltipData();
      aggregate.dice.push(...tooltipData.rolls);
      aggregate.icon ??= tooltipData.icon;
      aggregate.method ??= tooltipData.method;
    }
    if ( term instanceof PoolTerm ) {
      term.rolls.forEach((poolTermRoll, i) => {
        // Get aggregated data for each roll
        const aggregated = aggregateDamageTerms(poolTermRoll);
        const result = term.results[i];
        // Apply main result classes to individual dice
        aggregated.dice.forEach(die => {
          const resultClasses = TERM_RESULT_CLASSES.filter(c => result[c]).join(" ");
          if ( resultClasses.length ) die.classes += ` ${resultClasses}`;
        });
        aggregate.dice.push(...aggregated.dice);
        aggregate.icon ??= aggregated.icon;
        aggregate.method ??= aggregated.method;
      });
    }
    let multiplier = 1;
    let operator = roll.terms[i];
    while ( operator instanceof OperatorTerm ) {
      if ( !["+", "-"].includes(operator.operator) ) hasMultiplication = true;
      if ( operator.operator === "-" ) multiplier *= -1;
      operator = roll.terms[--i];
    }
    if ( term instanceof NumericTerm ) aggregate.constant += value * multiplier;
  }
  if ( hasMultiplication ) aggregate.constant = null;
  return aggregate;
}

/* -------------------------------------------- */

/**
 * Split terms into groups based on operators. Addition & subtraction will split groups while multiplication and
 * division will keep groups together. These groups also contain information on contained types written in flavor
 * and whether they are negative.
 * @param {RollTerm[]} terms  Terms to chunk.
 * @param {string} type       Type specified in the roll as a whole.
 * @returns {{ terms: RollTerm[], negative: boolean, type: string }[]}
 */
function chunkTerms(terms, type) {
  const pushChunk = () => {
    currentChunk.type ??= type;
    chunks.push(currentChunk);
    currentChunk = null;
    negative = false;
  };
  const isValidType = t => ((t in CONFIG.DND5E.damageTypes) || (t in CONFIG.DND5E.healingTypes));
  const chunks = [];
  let currentChunk;
  let negative = false;

  for ( let term of terms ) {
    // Plus or minus operators split chunks
    if ( (term instanceof OperatorTerm) && ["+", "-"].includes(term.operator) ) {
      if ( currentChunk ) pushChunk();
      if ( term.operator === "-" ) negative = !negative;
      continue;
    }

    // All other terms get added to the current chunk
    term = RollTerm.fromData(foundry.utils.deepClone(term.toJSON()));
    currentChunk ??= { terms: [], negative, type: null };
    currentChunk.terms.push(term);
    const flavor = term.flavor?.toLowerCase().trim();
    if ( isValidType(flavor) ) {
      currentChunk.type ??= flavor;
      term.options.flavor = "";
    }
  }

  if ( currentChunk ) pushChunk();
  return chunks;
}
