export {default as D20Roll} from "./dice/d20-roll.js";
export {default as DamageRoll} from "./dice/damage-roll.js";

/**
 * A standardized helper function for simplifying the constant parts of a multipart
 * roll formula. A new, simplified version of the formula is returned.
 * @param {String} formula                      A roll formula
 * @param {Object} [options={}]                 A configuration object
 * @param {Boolean} [option.ignoreFlavor=true]  A Boolean controlling whether flavor text
 *                                              is included in the simplified roll formula
 *                                              returned by the function
 *
 * @returns {String} A simplified roll formula
 */
export function simplifyRollFormula(formula, { ignoreFlavor=true }={}) {
  // Create a new roll and verify that the formula is valid before attempting simplification
  let roll;
  try {
    roll = new Roll(formula);
  } catch(err) {
    console.warn(`Unable to simplify formula '${formula}': ${err}`);
  }
  Roll.validate(roll.formula);

  // Optionally stip flavor annotations
  if (ignoreFlavor) roll.terms = Roll.parse(roll.formula.replace(RollTerm.FLAVOR_REGEXP, ""));

  // Perform arithmetic simplification on the existing roll terms and remove any
  // duplicate operators. Replace the existing roll terms with the new simplified set.
  roll.terms = _simplifyRedundantOperatorTerms(roll.terms);

  // Perform no further simplification if terms that include multiplication and divison.
  if (roll.terms.find((term) => ["/", "*"].includes(term.operator))) {
    return roll.constructor.getFormula(roll.terms);
  }

  // Attempt to convert complex and unknown terms to NumericTerms.
  roll.terms = _evaluateComplexNumericTerms(roll.terms);

  // Group terms by type and perform simplifications on various types of roll term.
  const groupedTerms = _groupTermsByType(roll.terms);
  groupedTerms.numericTerms = _simplifyNumericTerms(groupedTerms.numericTerms || []);
  groupedTerms.diceTerms = _simplifyDiceTerms(groupedTerms.diceTerms || []);

  // Recombine the terms into a single term array and remove an initial + operator if present.
  const simplifiedTerms = Object.values(groupedTerms).flat();
  if (simplifiedTerms[0]?.operator === "+") simplifiedTerms.shift();
  return roll.constructor.getFormula(simplifiedTerms);
}

/**
 * A helper function to evaluate ParentheticalTerms, MathTerms, and StringTerms that can
 * be evaluated to a simple NumericTerms. Returns a new array of terms with any applicable
 * terms converted to NumericTerms.
 * @param {RollTerm[]} terms  An array of roll terms (Die, OperatorTerm, NumericTerm, etc.)
 *
 * @returns {RollTerm[]}      A new array of roll terms with various complex terms converted
 *                          to numeric terms.
 */
function _evaluateComplexNumericTerms(terms) {
  return terms.map((term) => {
    if ( [ParentheticalTerm, MathTerm, StringTerm].some(type => term instanceof type) ) {
      try {
        term = new NumericTerm({ number: Roll.safeEval(term.formula) });
      } catch {
        // In the event of an exception, the term cannot be evaluated, likely because
        // its formula includes a die roll or flavour text. Leave the term as-is.
      }
    }
    return term;
  });
}

/**
 * A helper function to remove redundant addition and subtraction operators
 * in roll terms.
 * @param {RollTerm[]} terms  An array of roll terms (Die, OperatorTerm, NumericTerm, etc.)
 * 
 * @return {RollTerm[]}  A new array of roll terms with redundant operators removed.
 */
function _simplifyRedundantOperatorTerms(terms) {
  return terms.reduce((acc, term) => {
    const prior = acc[acc.length - 1];
    const sequentialOperators = (prior instanceof OperatorTerm) && (term instanceof OperatorTerm);
  
    // If the previous and current term are not a series of operators, add the term
    // to the accumulated terms and return.
    if (!sequentialOperators) {
      acc.push(term);
      return acc;
    }
    
    // Create a set containing the operators used in the current and previous term.
    const operators = new Set([prior.operator, term.operator]);

    // If the set contains a single term and it is a "+" operator, return the
    // accumulated terms as they are.
    if ( (operators.size === 1) && (operators.has("+")) ) {
      return acc;

    // If the set contains a single term and it is a "-" operator, remove the
    // previous term from the accumulated terms and replace it with a "+" operator.
    } else if ( (operators.size === 1) && (operators.has("-")) ) {
      acc.splice(-1, 1, new OperatorTerm({ operator: "+" }));

    // If the set contains both a "+" and "-" operator, remove the previous term from
    // the accumulated terms and insert a subtraction operator in its place.
    } else if (operators.has("+") && operators.has("-")) {
      acc.splice(-1, 1, new OperatorTerm({ operator: "-" }));

    // In cases where the first operator is a "*" or "/" operator and the second
    // operator is a "+" operator, the "+" is redundant.
    } else if (["*", "/"].includes(prior.operator) && operators.has("+")) {
      return acc;

    // In all other cases, simply no simplification is necessary. Append the term as-is.
    } else {
      acc.push(term);
    }

    return acc;
  }, []);
}

/**
 * A helper function to combine DiceTerms for a roll, returning a new array of terms
 * where dice of the same size are merged into a single DiceTerm. DiceTerms with flavor
 * text are intentionally not merged into the other DiceTerms so that the flavour text
 * is not lost.
 * @param {RollTerm[]} terms An array of DiceTerms and associated OperatorTerms
 * 
 * @returns {RollTerm[]}  A new array of simplified dice terms
 */
function _simplifyDiceTerms(terms) {
  const simplified = [];

  // Split the terms array into OperatorTerm-DiceTerm pairs and aort the pairs
  // with flavor annotations from those without.
  const { annotated, unannotated } = _chunkArray(terms, 2).reduce((obj, [operator, diceTerm]) => {
    if ( diceTerm.flavor ) obj.annotated.push(operator, diceTerm);

    // Unlike in _simplifyNumericTerms, maintain the two-element array format
    // for ease of comparison in the following simplification steps.
    else obj.unannotated.push([operator, diceTerm]);
    return obj;
  }, { annotated: [], unannotated: [] });

  // Find all of the dice sizes used in the terms that can be simplified.
  const diceSizes = new Set(unannotated.map(([_, diceTerm]) => diceTerm.faces));

  diceSizes.forEach((dieSize) => {
    // Find all dice of a given size
    const matchingDice = unannotated.filter(([_, diceTerm]) => diceTerm.faces === dieSize);
    
    // Split positive and negative dice terms
    const { positive, negative } = matchingDice.reduce((obj, [{ operator }, { number }]) => {
      operator === "+" ? obj.positive.push(number) : obj.negative.push(number);
      return obj;
    }, { positive: [], negative: [] });

    const createCombinedDiceTerm = (termGroup, operator) => {
      if (termGroup.length) {
        const quantity = Roll.safeEval(termGroup.join("+"));

        // Create a new Die and OperatorTerm using the calculated quantities.
        simplified.push(
          new OperatorTerm({ operator }),
          new Die({ number: Math.abs(quantity), faces: dieSize })
        );
      };
    };

    createCombinedDiceTerm(positive, "+");
    createCombinedDiceTerm(negative, "-");
  });

  return [...simplified, ...annotated];
}

/**
 * A helper function to combine NumericTerms for a roll, returning a new array of terms
 * with the static modifiers combined. NumericTerms with flavor text are intentionally
 * not merged into the other NumericTerms so that the flavour text is not lost.
 * @param {RollTerm[]} terms  An array of NumericTerms and associated OperatorTerms
 * 
 * @return {RollTerm[]}  A new array of roll terms with its NumericTerm objects combined into
 *                       a single object. NumericTerm objects with flavor text are not merged
 *                       and remain separate objects within the term array.
 */
function _simplifyNumericTerms(terms) {
  const simplified = [];

  // Split the terms array into OperatorTerm-NumericTerm pairs and sort the pairs
  // with flavor annotations from those without.
  const { annotated, unannotated } = _chunkArray(terms, 2).reduce((obj, [operator, diceTerm]) => {
    if ( diceTerm.flavor ) obj.annotated.push(operator, diceTerm);
    else obj.unannotated.push(operator, diceTerm);
    return obj;
  }, { annotated: [], unannotated: [] });
  
  // Combine the unannotated numerical bonuses into a single number and create
  // a new NumericTerm to represent the value in the terms.
  if (unannotated.length) {
    const staticBonus = Roll.safeEval(Roll.getFormula(unannotated));
    if (staticBonus === 0) return [...annotated];

    // If the staticBonus is greatert than 0, add a "+" operator so the formula remains valid.
    if (staticBonus > 0) simplified.push(new OperatorTerm({ operator: "+"}));
    simplified.push(new NumericTerm({ number: staticBonus} ));
  }

  return [...simplified, ...annotated];
}

/**
 * Splits an array of dissimilar roll terms into a several arrays of roll terms, each
 * containing terms of the same type. OperatorTerms are included alongside other term
 * types in each array.
 * @param {RollTerm[]} terms  An array of RollTerms
 * 
 * @returns {Object} An object mapping term types to arrays containing roll terms of that type.
 */
function _groupTermsByType(terms) {
  terms = Array.from(terms);
  const relevantTermTypes = [DiceTerm, PoolTerm, ParentheticalTerm, MathTerm, StringTerm, NumericTerm];

  // Add an initial operator so that terms can be rerranged arbitrarily without
  // creating an invalid formula.
  if ( !(terms[0] instanceof OperatorTerm) ) terms.unshift(new OperatorTerm({ operator: "+" }));

  return terms.reduce((obj, term, i) => {
    // Count Die, Coin, and FateDie terms as DiceTerms
    const type = [Die, Coin, FateDie].includes(term.constructor) ? DiceTerm : term.constructor;
    if ( !relevantTermTypes.includes(type) ) return obj;
    const key = type.name.charAt(0).toLowerCase() + type.name.substring(1) + "s";
        
    // Create a new array as the value for the appropriate key if the key does
    // not yet exist. Push the term and the preceding OperatorTerm.
    if (!obj[key]) obj[key] = [];
    obj[key].push(terms[i - 1], term);
    return obj;
  }, {});
}

/**
 * A helper function to split an array into a series of sub-arrays based on
 * a given chunk size. This can be used to create operator + non-operator term
 * pairs form an array of terms.
 * @param {Array} array
 * @param {number} chunkSize
 * 
 * @returns {Array | Array[]} An array of sub-arrays of the requested size.
 */
function _chunkArray(array, chunkSize) {
  return array.reduce((chunks, _, i) => {
    if (i % chunkSize === 0) chunks.push(array.slice(i, i + chunkSize));
    return chunks;
  }, []);
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
