export {default as D20Roll} from "./dice/d20-roll.js";
export {default as DamageRoll} from "./dice/damage-roll.js";

/**
 * A standardized helper function for simplifying the constant parts of a multipart
 * roll formula.
 * 
 * A new, simplified version of the formula is returned. 
 * 
 * @param {String} formula                      A roll formula
 * @param {Object} [options={}]                 A configuration object
 * @param {Boolean} [option.ignoreFlavor=true]  A Boolean controlling whether flavor text
 *                                              is included in the simplified roll formula
 *                                              returned by the function
 */
 export function simplifyRollFormula(formula, { ignoreFlavor=true }={}) {
  const roll = new Roll(formula);

  // Verify that the roll formula is valid before attempting simplification
  Roll.validate(roll.formula);

  // Optionally strip flavor text from the provided roll formula
  if (ignoreFlavor) roll.terms = _stripFlavor(roll.formula);

  // Perform arithmetic simplification on the existing roll terms and
  // remove any duplicate operators. Replace the existing roll terms
  // with the new simplified set.
  roll.terms = _simplifyRedundantOperatorTerms(roll.terms);

  // Attempt to combine numeric terms that do not have flavor text attached.
  // Replace the existing roll terms with the new simplified set.
  roll.terms = _simplifyNumericTerms(roll.terms);

  // Generate a new formula from the updated roll terms and return it
  return roll.constructor.getFormula(roll.terms);
}

/**
 * A helper function to remove redundant addition and subtraction operators
 * in roll terms.
 * 
 * @param {Object[]} terms  An array of roll terms (Die, OperatorTerm, NumericTerm, etc.)
 * 
 * @return {Object[]}  A new array of roll terms with redundant operators removed
 */
function _simplifyRedundantOperatorTerms(terms) {
  const simplifiedTerms = terms.reduce((accumulatedTerms, currentTerm) => {
    const previousTerm = accumulatedTerms[accumulatedTerms.length - 1];
    const sequentialOperators = (previousTerm instanceof OperatorTerm) && (currentTerm instanceof OperatorTerm);
  
    // If the previous and current term are not a series of operators, add the term
    // to the accumulated terms and return.
    if (!sequentialOperators) {
      accumulatedTerms.push(currentTerm);
      return accumulatedTerms;
    }
    
    // Create a set containing the operator types used in the current and 
    // previous term.
    const operators = new Set([previousTerm.operator, currentTerm.operator]);

    // If the set contains a single term and it is an addition operator,
    // adding a second addition operator is redundant. Return the accumulated
    // terms as they are.
    if ( (operators.size === 1) && (operators.has("+")) ) {
      return accumulatedTerms;

    // If the set contains a single term and it is a substraction operator,
    // the two subtractions cancel out. Remove the previous element from the
    // accumulated terms and replace it with an addition operator.
    } else if ( (operators.size === 1) && (operators.has("-")) ) {
      accumulatedTerms.splice(-1, 1, new OperatorTerm({ operator: "+" }));

    // If the set contains both an addition and subtraction operator,
    // the subtraction operator is the only one the matters. Remove the previous
    // element from the accumulated terms and insert a subtraction operator in
    // its place.
    } else if (operators.has("+") && operators.has("-")) {
      accumulatedTerms.splice(-1, 1, new OperatorTerm({ operator: "-" }));

    // In cases where the first operator is a muliplication or division operator
    // and the second operator is an addition operator, the addition is redundant.
    } else if (["*", "/"].includes(previousTerm.operator) && operators.has("+")) {
      return accumulatedTerms;

    // In all other cases, we should do nothing special. Append the current term to the
    // accumulated terms and move on.
    } else {
      accumulatedTerms.push(currentTerm);
    }

    return accumulatedTerms;
  }, []);

  return simplifiedTerms;
}

/**
 * A helper function to combine NumericTerms for a roll, returning a new array of terms
 * with the static modifiers combined.
 * 
 * Terms for a formula that include division and multiplication are currently not supported,
 * and such lists of terms will be returned as-is. ParentheticalTerms and Die are likewise
 * ignored in the current implementation.
 * 
 * NumericTerms with flavor text are intentionally not merged into the other NumericTerms
 * so that the flavour text is not lost.
 * 
 * @param {Object[]} terms  An array of roll terms (Die, OperatorTerm, NumericTerm, etc.)
 * 
 * @return {Object[]}  A new array of roll terms with its NumericTerm objects combined into
 *                     a single object. NumericTerm objects with flavor text are not merged
 *                     and remain separate objects within the term array.
 */
function _simplifyNumericTerms(_terms) {
  // Do not simplify terms that include multiplication and divison.
  if (_terms.find((term) => ["/", "*"].includes(term.operator))) return _terms;

  const terms = Array.from(_terms);
  const simplifiedTerms = [];
  const numericTerms = [];
  
  terms.forEach((term, i, termArray) => {
    // Skip over operators as they are handled when other terms are encountered.
    if (term instanceof OperatorTerm) {
      return;
    }

    // Isolate all numeric terms that do not have flavor text.
    if ( (term instanceof NumericTerm) && (!term.flavor) ) {
      // If the numeroc term is the first element in the terms array, it has no 
      // preceeding operator, so just push the term.
      if (i === 0) numericTerms.push(term);

      // If the term is not the first element, push the preceeding operator to
      // the terms array alongside the numeric term.
      else numericTerms.push(termArray[i - 1], term);
    }
    
    // Repeat the same steps for the non-numeric terms, pushing them to the
    // simplifiedTerms array instead, as no further processing is required.
    else {
      if (i === 0) simplifiedTerms.push(term);
      else simplifiedTerms.push(termArray[i - 1], term);
    }
  });

  // Combine the unannotated numerical bonuses into a single number and create
  // a new NumericTerm to represent the value in the terms.
  if (numericTerms.length) {
    const staticBonus = Roll.safeEval(Roll.getFormula(numericTerms));

    // If the staticBonus is 0 or greater, there is no operator attached to it.
    // Add a plus operator so that the formula remains valid.
    if (staticBonus >= 0) {
      simplifiedTerms.push(new OperatorTerm({ operator: "+"}));
    }

    simplifiedTerms.push(new NumericTerm({ number: staticBonus} ));

  // In the event that no terms are provided at all, this creates a new
  // NumericTerm with a value of 0.
  } else if (!simplifiedTerms.length) {
    simplifiedTerms.push(new NumericTerm({ number: 0 }))
  }

  return simplifiedTerms;
}

/**
 * Creates a set of terms from a roll formula with any flavour text absent in the
 * resulting terms.
 * 
 * @param {String} formula  A roll formula
 * 
 * @returns {Object[]}  An array of roll terms with the flavour text removed
 */
function _stripFlavor(formula) {
  return Roll.parse(formula.replace(RollTerm.FLAVOR_REGEXP, ""));
}

/* -------------------------------------------- */
/* D20 Roll                                     */
/* -------------------------------------------- */

/**
 * A standardized helper function for managing core 5e d20 rolls.
 * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
 * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
 *
 * @param {string[]} parts          The dice roll component parts, excluding the initial d20
 * @param {object} data             Actor or item data against which to parse the roll
 *
 * @param {boolean} [advantage]       Apply advantage to the roll (unless otherwise specified)
 * @param {boolean} [disadvantage]    Apply disadvantage to the roll (unless otherwise specified)
 * @param {number} [critical]         The value of d20 result which represents a critical success
 * @param {number} [fumble]           The value of d20 result which represents a critical failure
 * @param {number} [targetValue]      Assign a target value against which the result of this roll should be compared
 * @param {boolean} [elvenAccuracy]   Allow Elven Accuracy to modify this roll?
 * @param {boolean} [halflingLucky]   Allow Halfling Luck to modify this roll?
 * @param {boolean} [reliableTalent]  Allow Reliable Talent to modify this roll?

 * @param {boolean} [chooseModifier=false] Choose the ability modifier that should be used when the roll is made
 * @param {boolean} [fastForward=false] Allow fast-forward advantage selection
 * @param {Event} [event]             The triggering event which initiated the roll
 * @param {string} [rollMode]         A specific roll mode to apply as the default for the resulting roll
 * @param {string} [template]         The HTML template used to render the roll dialog
 * @param {string} [title]            The dialog window title
 * @param {Object} [dialogOptions]    Modal dialog options
 *
 * @param {boolean} [chatMessage=true] Automatically create a Chat Message for the result of this roll
 * @param {object} [messageData={}] Additional data which is applied to the created Chat Message, if any
 * @param {string} [rollMode]       A specific roll mode to apply as the default for the resulting roll
 * @param {object} [speaker]        The ChatMessage speaker to pass when creating the chat
 * @param {string} [flavor]         Flavor text to use in the posted chat message
 *
 * @return {Promise<D20Roll|null>}  The evaluated D20Roll, or null if the workflow was cancelled
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
  if ( chooseModifier && !isFF ) data["mod"] = "@mod";

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

  // Remove redundant operator terms from the roll formula
  const simplifiedRollFormula = simplifyRollFormula(roll.formula, { ignoreFlavor: false });

  // Update roll terms and formula
  roll.terms = Roll.parse(simplifiedRollFormula);
  roll._formula = roll.constructor.getFormula(roll.terms);

  // Evaluate the configured roll
  await roll.evaluate({async: true});

  // Create a Chat Message
  if ( speaker ) {
    console.warn(`You are passing the speaker argument to the d20Roll function directly which should instead be passed as an internal key of messageData`);
    messageData.speaker = speaker;
  }
  if ( roll && chatMessage ) await roll.toMessage(messageData);
  return roll;
}

/* -------------------------------------------- */

/**
 * Determines whether this d20 roll should be fast-forwarded, and whether advantage or disadvantage should be applied
 * @returns {{isFF: boolean, advantageMode: number}}  Whether the roll is fast-forward, and its advantage mode
 */
function _determineAdvantageMode({event, advantage=false, disadvantage=false, fastForward=false}={}) {
  const isFF = fastForward || (event && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey));
  let advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.NORMAL;
  if ( advantage || event?.altKey ) advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE;
  else if ( disadvantage || event?.ctrlKey || event?.metaKey ) advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE;
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
 * @param {string[]} parts          The dice roll component parts, excluding the initial d20
 * @param {object} [data]           Actor or item data against which to parse the roll
 *
 * @param {boolean} [critical=false] Flag this roll as a critical hit for the purposes of fast-forward or default dialog action
 * @param {number} [criticalBonusDice=0] A number of bonus damage dice that are added for critical hits
 * @param {number} [criticalMultiplier=2] A critical hit multiplier which is applied to critical hits
 * @param {boolean} [multiplyNumeric=false] Multiply numeric terms by the critical multiplier
 * @param {boolean} [powerfulCritical=false] Apply the "powerful criticals" house rule to critical hits

 * @param {boolean} [fastForward=false] Allow fast-forward advantage selection
 * @param {Event}[event]            The triggering event which initiated the roll
 * @param {boolean} [allowCritical=true] Allow the opportunity for a critical hit to be rolled
 * @param {string} [template]       The HTML template used to render the roll dialog
 * @param {string} [title]          The dice roll UI window title
 * @param {object} [dialogOptions]  Configuration dialog options
 *
 * @param {boolean} [chatMessage=true] Automatically create a Chat Message for the result of this roll
 * @param {object} [messageData={}] Additional data which is applied to the created Chat Message, if any
 * @param {string} [rollMode]       A specific roll mode to apply as the default for the resulting roll
 * @param {object} [speaker]        The ChatMessage speaker to pass when creating the chat
 * @param {string} [flavor]         Flavor text to use in the posted chat message
 *
 * @return {Promise<DamageRoll|null>} The evaluated DamageRoll, or null if the workflow was canceled
 */
export async function damageRoll({
  parts=[], data, // Roll creation
  critical=false, criticalBonusDice, criticalMultiplier, multiplyNumeric, powerfulCritical, // Damage customization
  fastForward=false, event, allowCritical=true, template, title, dialogOptions, // Dialog configuration
  chatMessage=true, messageData={}, rollMode, speaker, flavor, // Chat Message customization
  }={}) {

  // Handle input arguments
  const defaultRollMode = rollMode || game.settings.get("core", "rollMode");

  // Construct the DamageRoll instance
  const formula = parts.join(" + ");
  const {isCritical, isFF} = _determineCriticalMode({critical, fastForward, event});
  const roll = new CONFIG.Dice.DamageRoll(formula, data, {
    flavor: flavor || title,
    critical: isCritical,
    criticalBonusDice,
    criticalMultiplier,
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

  // Remove redundant operator terms from the roll formula
  const simplifiedRollFormula = simplifyRollFormula(roll.formula, { ignoreFlavor: false });

  // Update roll terms and formula
  roll.terms = Roll.parse(simplifiedRollFormula);
  roll._formula = roll.constructor.getFormula(roll.terms);

  // Evaluate the configured roll
  await roll.evaluate({async: true});

  // Create a Chat Message
  if ( speaker ) {
    console.warn(`You are passing the speaker argument to the damageRoll function directly which should instead be passed as an internal key of messageData`);
    messageData.speaker = speaker;
  }
  if ( roll && chatMessage ) await roll.toMessage(messageData);
  return roll;
}

/* -------------------------------------------- */

/**
 * Determines whether this d20 roll should be fast-forwarded, and whether advantage or disadvantage should be applied
 * @returns {{isFF: boolean, isCritical: boolean}}  Whether the roll is fast-forward, and whether it is a critical hit
 */
function _determineCriticalMode({event, critical=false, fastForward=false}={}) {
  const isFF = fastForward || (event && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey));
  if ( event?.altKey ) critical = true;
  return {isFF, isCritical: critical};
}
