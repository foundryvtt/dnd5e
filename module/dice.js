export {default as D20Roll} from "./dice/d20-roll.js";
export {default as DamageRoll} from "./dice/damage-roll.js";

/**
 * A standardized helper function for simplifying the constant parts of a multipart roll formula.
 *
 * @param {string} formula                          The original roll formula
 * @param {object} [options]                        Formatting options
 * @param {boolean} [options.preserveFlavor=false]   Preserve flavor text in the simplified formula
 *
 * @returns {string}  The resulting simplified formula
 */
export function simplifyRollFormula(formula, { preserveFlavor=false } = {}) {
  // Create a new roll and verify that the formula is valid before attempting simplification.
  let roll;
  try { roll = new Roll(formula); }
  catch(err) { console.warn(`Unable to simplify formula '${formula}': ${err}`); }
  Roll.validate(roll.formula);

  // Optionally stip flavor annotations.
  if (!preserveFlavor) roll.terms = Roll.parse(roll.formula.replace(RollTerm.FLAVOR_REGEXP, ""));

  // Perform arithmetic simplification on the existing roll terms.
  roll.terms = _simplifyOperatorTerms(roll.terms);

  if (/[*/]/.test(roll.formula)) {
    return ( roll.isDeterministic ) && ( !/\[/.test(roll.formula) || !preserveFlavor )
      ? roll.evaluate({ async: false }).total.toString()
      : roll.constructor.getFormula(roll.terms);
  }

  // Flatten the roll formula and eliminate string terms.
  roll.terms = _expandParentheticalTerms(roll.terms);
  roll.terms = Roll.simplifyTerms(roll.terms);

  // Group terms by type and perform simplifications on various types of roll term.
  let { poolTerms, diceTerms, mathTerms, numericTerms } = _groupTermsByType(roll.terms);
  numericTerms = _simplifyNumericTerms(numericTerms || []);
  diceTerms = _simplifyDiceTerms(diceTerms || []);

  // Recombine the terms into a single term array and remove an initial + operator if present.
  const simplifiedTerms = [diceTerms, poolTerms, mathTerms, numericTerms].flat().filter(Boolean);
  if (simplifiedTerms[0]?.operator === "+") simplifiedTerms.shift();
  return roll.constructor.getFormula(simplifiedTerms);
}

/**
 * A helper function to perform arithmetic simplification and remove redundant operator terms.
 * @param {RollTerm[]} terms  An array of roll terms
 * @returns {RollTerm[]}  A new array of roll terms with redundant operators removed.
 */
function _simplifyOperatorTerms(terms) {
  return terms.reduce((acc, term) => {
    const prior = acc[acc.length - 1];
    const ops = new Set([prior?.operator, term.operator]);

    // If one of the terms is not an operator, add the current term as is.
    if (ops.has(undefined)) acc.push(term);

    // Replace consecutive "+ -" operators with a "-" operator.
    else if ( (ops.has("+")) && (ops.has("-")) ) acc.splice(-1, 1, new OperatorTerm({ operator: "-" }));

    // Replace double "-" operators with a "+" operator.
    else if ( (ops.has("-")) && (ops.size === 1) ) acc.splice(-1, 1, new OperatorTerm({ operator: "+" }));

    // Don't include "+" operators that directly follow "+", "*", or "/". Otherwise, add the term as is.
    else if (!ops.has("+")) acc.push(term);

    return acc;
  }, []);
}

/**
 * A helper function for combining unannoted numeric terms in an array into a single numeric term.
 * @param {object[]} terms An array of roll terms
 * @returns {object[]} A new array of terms with unannotated numeric terms combined into one.
 */
function _simplifyNumericTerms(terms) {
  const simplified = [];
  const { annotated, unannotated } = _separateAnnotatedTerms(terms);

  // Combine the unannotated numerical bonuses into a single new NumericTerm.
  if (unannotated.length) {
    const staticBonus = Roll.safeEval(Roll.getFormula(unannotated));
    if (staticBonus === 0) return [...annotated];

    // If the staticBonus is greater than 0, add a "+" operator so the formula remains valid.
    if (staticBonus > 0) simplified.push(new OperatorTerm({ operator: "+"}));
    simplified.push(new NumericTerm({ number: staticBonus} ));
  }
  return [...simplified, ...annotated];
}

/**
 * A helper function to group dice of the same size and sign into single dice terms.
 * @param {object[]} terms An array of DiceTerms and associated OperatorTerms.
 * @returns {object[]}  A new array of simplified dice terms.
 */
function _simplifyDiceTerms(terms) {
  const { annotated, unannotated } = _separateAnnotatedTerms(terms);

  // Split the unannotated terms into different die sizes and signs
  const diceQuantities = unannotated.reduce((obj, curr, i) => {
    if (curr instanceof OperatorTerm) return obj;
    const key = `${unannotated[i - 1].operator}${curr.faces}`;
    obj[key] = (obj[key] ?? 0) + curr.number;
    return obj;
  }, {});

  // Add new die and operator terms to simplified for each die size and sign
  const simplified = Object.entries(diceQuantities).flatMap(([key, number]) => ([
    new OperatorTerm({ operator: key.charAt(0) }),
    new Die({ number, faces: parseInt(key.slice(1)) })
  ]));
  return [...simplified, ...annotated];
}

/**
 * A helper function to extract the contents of parenthetical terms into their own terms.
 * @param {object[]} terms An array of roll terms
 * @returns {object[]} A new array of terms with no parenthetical terms.
 */
function _expandParentheticalTerms(terms) {
  terms = terms.reduce((acc, term) => {
    if (term instanceof ParentheticalTerm) {
      if (term.isDeterministic) term = new NumericTerm({ number: Roll.safeEval(term.term) });
      else {
        const subterms = new Roll(term.term).terms;
        term = _expandParentheticalTerms(subterms);
      }
    }
    acc.push(term);
    return acc;
  }, []);
  return _simplifyOperatorTerms(terms.flat());
}

/**
 * A helper function tp group terms into PoolTerms, DiceTerms, MathTerms, and NumericTerms.
 * MathTerms are included as NumericTerms if they are deterministic.
 * @param {RollTerm[]} terms  An array of roll terms
 * @returns {object} An object mapping term types to arrays containing roll terms of that type.
 */
function _groupTermsByType(terms) {
  // Add an initial operator so that terms can be rerranged arbitrarily.
  if ( !(terms[0] instanceof OperatorTerm) ) terms.unshift(new OperatorTerm({ operator: "+" }));

  return terms.reduce((obj, term, i) => {
    let type;
    if (term instanceof DiceTerm) type = DiceTerm;
    else if ( (term instanceof MathTerm) && (term.isDeterministic) ) type = NumericTerm;
    else type = term.constructor;
    const key = `${type.name.charAt(0).toLowerCase()}${type.name.substring(1)}s`;

    // Push the term and the preceding OperatorTerm.
    (obj[key] = obj[key] ?? []).push(terms[i - 1], term);
    return obj;
  }, {});
}

/**
 * A helper function to separate annotated terms from unannotated terms.
 * @param {object[]} terms An array of DiceTerms and associated OperatorTerms
 * @returns {Array | Array[]} A pair of term arrays, one containing annotated terms.
 */
function _separateAnnotatedTerms(terms) {
  return terms.reduce((obj, curr, i) => {
    if (curr instanceof OperatorTerm) return obj;
    obj[curr.flavor ? "annotated" : "unannotated"].push(terms[i - 1], curr);
    return obj;
  }, { annotated: [], unannotated: [] });
}

/* -------------------------------------------- */
/* D20 Roll                                     */
/* -------------------------------------------- */

/**
 * A standardized helper function for managing core 5e d20 rolls.
 * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
 * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
 *
 * @param {object} [config]
 * @param {string[]} [config.parts]          The dice roll component parts, excluding the initial d20
 * @param {object} [config.data]             Actor or item data against which to parse the roll
 *
 * @param {boolean} [config.advantage]       Apply advantage to the roll (unless otherwise specified)
 * @param {boolean} [config.disadvantage]    Apply disadvantage to the roll (unless otherwise specified)
 * @param {number} [config.critical]         The value of d20 result which represents a critical success
 * @param {number} [config.fumble]           The value of d20 result which represents a critical failure
 * @param {number} [config.targetValue]      Assign a target value against which the result of this roll
 *                                           should be compared
 * @param {boolean} [config.elvenAccuracy]   Allow Elven Accuracy to modify this roll?
 * @param {boolean} [config.halflingLucky]   Allow Halfling Luck to modify this roll?
 * @param {boolean} [config.reliableTalent]  Allow Reliable Talent to modify this roll?
 *
 * @param {boolean} [config.chooseModifier=false] Choose the ability modifier that should be used when the roll is made
 * @param {boolean} [config.fastForward=false] Allow fast-forward advantage selection
 * @param {Event} [config.event]             The triggering event which initiated the roll
 * @param {string} [config.template]         The HTML template used to render the roll dialog
 * @param {string} [config.title]            The dialog window title
 * @param {object} [config.dialogOptions]    Modal dialog options
 *
 * @param {boolean} [config.chatMessage=true] Automatically create a Chat Message for the result of this roll
 * @param {object} [config.messageData={}] Additional data which is applied to the created Chat Message, if any
 * @param {string} [config.rollMode]       A specific roll mode to apply as the default for the resulting roll
 * @param {object} [config.speaker]        The ChatMessage speaker to pass when creating the chat
 * @param {string} [config.flavor]         Flavor text to use in the posted chat message
 *
 * @returns {Promise<D20Roll|null>}  The evaluated D20Roll, or null if the workflow was cancelled
 */
export async function d20Roll({
  parts=[], data={}, // Roll creation
  advantage, disadvantage, fumble=1, critical=20, targetValue, elvenAccuracy, halflingLucky, reliableTalent, // Roll customization
  chooseModifier=false, fastForward=false, event, template, title, dialogOptions, // Dialog configuration
  chatMessage=true, messageData={}, rollMode, speaker, flavor // Chat Message customization
}={}) {

  // Handle input arguments
  const formula = ["1d20"].concat(parts).join(" + ");
  const {advantageMode, isFF} = _determineAdvantageMode({advantage, disadvantage, fastForward, event});
  const defaultRollMode = rollMode || game.settings.get("core", "rollMode");
  if ( chooseModifier && !isFF ) data.mod = "@mod";

  // Construct the D20Roll instance
  const roll = new CONFIG.Dice.D20Roll(formula, data, {
    flavor: flavor || title,
    advantageMode,
    defaultRollMode,
    critical,
    fumble,
    targetValue,
    elvenAccuracy,
    halflingLucky,
    reliableTalent
  });

  // Prompt a Dialog to further configure the D20Roll
  if ( !isFF ) {
    const configured = await roll.configureDialog({
      title,
      chooseModifier,
      defaultRollMode: defaultRollMode,
      defaultAction: advantageMode,
      defaultAbility: data?.item?.ability,
      template
    }, dialogOptions);
    if ( configured === null ) return null;
  }

  // Evaluate the configured roll
  await roll.evaluate({async: true});

  // Create a Chat Message
  if ( speaker ) {
    console.warn("You are passing the speaker argument to the d20Roll function directly which should instead be passed as an internal key of messageData");
    messageData.speaker = speaker;
  }
  if ( roll && chatMessage ) await roll.toMessage(messageData);
  return roll;
}

/* -------------------------------------------- */

/**
 * Determines whether this d20 roll should be fast-forwarded, and whether advantage or disadvantage should be applied
 * @param {object} [config]
 * @param {Event} [config.event]           Event that triggered the roll.
 * @param {boolean} [config.advantage]     Is something granting this roll advantage?
 * @param {boolean} [config.disadvantage]  Is something granting this roll disadvantage?
 * @param {boolean} [config.fastForward]   Should the roll dialog be skipped?
 * @returns {{isFF: boolean, advantageMode: number}}  Whether the roll is fast-forward, and its advantage mode.
 */
function _determineAdvantageMode({event, advantage=false, disadvantage=false, fastForward=false}={}) {
  const isFF = fastForward || (event && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey));
  let advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.NORMAL;
  if ( advantage || event?.altKey ) advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE;
  else if ( disadvantage || event?.ctrlKey || event?.metaKey ) {
    advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE;
  }
  return {isFF, advantageMode};
}

/* -------------------------------------------- */
/* Damage Roll                                  */
/* -------------------------------------------- */

/**
 * A standardized helper function for managing core 5e damage rolls.
 * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
 * This chooses the default options of a normal attack with no bonus, Critical, or no bonus respectively
 *
 * @param {object} [config]
 * @param {string[]} [config.parts]        The dice roll component parts, excluding the initial d20
 * @param {object} [config.data]           Actor or item data against which to parse the roll
 *
 * @param {boolean} [config.critical=false] Flag this roll as a critical hit for the purposes of
 *                                          fast-forward or default dialog action
 * @param {number} [config.criticalBonusDice=0] A number of bonus damage dice that are added for critical hits
 * @param {number} [config.criticalMultiplier=2] A critical hit multiplier which is applied to critical hits
 * @param {boolean} [config.multiplyNumeric=false] Multiply numeric terms by the critical multiplier
 * @param {boolean} [config.powerfulCritical=false] Apply the "powerful criticals" house rule to critical hits
 * @param {string} [config.criticalBonusDamage] An extra damage term that is applied only on a critical hit
 *
 * @param {boolean} [config.fastForward=false] Allow fast-forward advantage selection
 * @param {Event}[config.event]            The triggering event which initiated the roll
 * @param {boolean} [config.allowCritical=true] Allow the opportunity for a critical hit to be rolled
 * @param {string} [config.template]       The HTML template used to render the roll dialog
 * @param {string} [config.title]          The dice roll UI window title
 * @param {object} [config.dialogOptions]  Configuration dialog options
 *
 * @param {boolean} [config.chatMessage=true] Automatically create a Chat Message for the result of this roll
 * @param {object} [config.messageData={}] Additional data which is applied to the created Chat Message, if any
 * @param {string} [config.rollMode]       A specific roll mode to apply as the default for the resulting roll
 * @param {object} [config.speaker]        The ChatMessage speaker to pass when creating the chat
 * @param {string} [config.flavor]         Flavor text to use in the posted chat message
 *
 * @returns {Promise<DamageRoll|null>} The evaluated DamageRoll, or null if the workflow was canceled
 */
export async function damageRoll({
  parts=[], data, // Roll creation
  critical=false, criticalBonusDice, criticalMultiplier, multiplyNumeric, powerfulCritical,
  criticalBonusDamage, // Damage customization
  fastForward=false, event, allowCritical=true, template, title, dialogOptions, // Dialog configuration
  chatMessage=true, messageData={}, rollMode, speaker, flavor // Chat Message customization
}={}) {

  // Handle input arguments
  const defaultRollMode = rollMode || game.settings.get("core", "rollMode");

  // Construct the DamageRoll instance
  const formula = parts.join(" + ");
  const {isCritical, isFF} = _determineCriticalMode({critical, fastForward, event});
  const roll = new CONFIG.Dice.DamageRoll(formula, data, {
    flavor: flavor || title,
    critical: isFF ? isCritical : false,
    criticalBonusDice,
    criticalMultiplier,
    criticalBonusDamage,
    multiplyNumeric: multiplyNumeric ?? game.settings.get("dnd5e", "criticalDamageModifiers"),
    powerfulCritical: powerfulCritical ?? game.settings.get("dnd5e", "criticalDamageMaxDice")
  });

  // Prompt a Dialog to further configure the DamageRoll
  if ( !isFF ) {
    const configured = await roll.configureDialog({
      title,
      defaultRollMode: defaultRollMode,
      defaultCritical: isCritical,
      template,
      allowCritical
    }, dialogOptions);
    if ( configured === null ) return null;
  }

  // Evaluate the configured roll
  await roll.evaluate({async: true});

  // Create a Chat Message
  if ( speaker ) {
    console.warn("You are passing the speaker argument to the damageRoll function directly which should instead be passed as an internal key of messageData");
    messageData.speaker = speaker;
  }
  if ( roll && chatMessage ) await roll.toMessage(messageData);
  return roll;
}

/* -------------------------------------------- */

/**
 * Determines whether this d20 roll should be fast-forwarded, and whether advantage or disadvantage should be applied
 * @param {object} [config]
 * @param {Event} [config.event]          Event that triggered the roll.
 * @param {boolean} [config.critical]     Is this roll treated as a critical by default?
 * @param {boolean} [config.fastForward]  Should the roll dialog be skipped?
 * @returns {{isFF: boolean, isCritical: boolean}}  Whether the roll is fast-forward, and whether it is a critical hit
 */
function _determineCriticalMode({event, critical=false, fastForward=false}={}) {
  const isFF = fastForward || (event && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey));
  if ( event?.altKey ) critical = true;
  return {isFF, isCritical: critical};
}

/**
 * Backport Roll#isDeterministic functionality from later foundry versions.
 */
export function shimIsDeterministic() {
  Object.defineProperty(Roll.prototype, "isDeterministic", {
    get() {
      return this.terms.every(t => t.isDeterministic);
    }
  });

  Object.defineProperty(RollTerm.prototype, "isDeterministic", {
    get() {
      return true;
    }
  });

  Object.defineProperty(DiceTerm.prototype, "isDeterministic", {
    get() {
      return false;
    }
  });

  Object.defineProperty(MathTerm.prototype, "isDeterministic", {
    get() {
      return this.terms.every(t => new Roll(t).isDeterministic);
    }
  });

  Object.defineProperty(ParentheticalTerm.prototype, "isDeterministic", {
    get() {
      return new Roll(this.term).isDeterministic;
    }
  });

  Object.defineProperty(PoolTerm.prototype, "isDeterministic", {
    get() {
      return this.terms.every(t => new Roll(t).isDeterministic);
    }
  });

  Object.defineProperty(StringTerm.prototype, "isDeterministic", {
    get() {
      const classified = Roll._classifyStringTerm(this.term, {intermediate: false});
      if ( classified instanceof StringTerm ) return true;
      return classified.isDeterministic;
    }
  });
}
