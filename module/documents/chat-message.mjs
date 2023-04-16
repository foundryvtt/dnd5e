/**
 * Highlight critical success or failure on d20 rolls.
 * @param {ChatMessage} message  Message being prepared.
 * @param {HTMLElement} html     Rendered contents of the message.
 * @param {object} data          Configuration data passed to the message.
 */
export function highlightCriticalSuccessFailure(message, html, data) {
  if ( !message.isRoll || !message.isContentVisible || !message.rolls.length ) return;

  // Highlight rolls where the first part is a d20 roll
  let d20Roll = message.rolls.find(r => {
    const d0 = r.dice[0];
    return (d0?.faces === 20) && (d0?.values.length === 1);
  });
  if ( !d20Roll ) return;
  d20Roll = dnd5e.dice.D20Roll.fromRoll(d20Roll);
  const d = d20Roll.dice[0];

  const isModifiedRoll = ("success" in d.results[0]) || d.options.marginSuccess || d.options.marginFailure;
  if ( isModifiedRoll ) return;

  // Highlight successes and failures
  if ( d20Roll.isCritical ) html.find(".dice-total").addClass("critical");
  else if ( d20Roll.isFumble ) html.find(".dice-total").addClass("fumble");
  else if ( d.options.target ) {
    if ( d20Roll.total >= d.options.target ) html.find(".dice-total").addClass("success");
    else html.find(".dice-total").addClass("failure");
  }
}

/* -------------------------------------------- */

/**
 * Optionally hide the display of chat card action buttons which cannot be performed by the user
 * @param {ChatMessage} message  Message being prepared.
 * @param {HTMLElement} html     Rendered contents of the message.
 * @param {object} data          Configuration data passed to the message.
 */
export function displayChatActionButtons(message, html, data) {
  const chatCard = html.find(".dnd5e.chat-card");
  if ( chatCard.length > 0 ) {
    const flavor = html.find(".flavor-text");
    if ( flavor.text() === html.find(".item-name").text() ) flavor.remove();

    // If the user is the message author or the actor owner, proceed
    let actor = game.actors.get(data.message.speaker.actor);
    if ( actor && actor.isOwner ) return;
    else if ( game.user.isGM || (data.author.id === game.user.id)) return;

    // Otherwise conceal action buttons except for saving throw
    const buttons = chatCard.find("button[data-action]");
    buttons.each((i, btn) => {
      if ( btn.dataset.action === "save" ) return;
      btn.style.display = "none";
    });
  }
}

/* -------------------------------------------- */

/**
 * This function is used to hook into the Chat Log context menu to add additional options to each message
 * These options make it easy to conveniently apply damage to controlled tokens based on the value of a Roll
 *
 * @param {HTMLElement} html    The Chat Message being rendered
 * @param {object[]} options    The Array of Context Menu options
 *
 * @returns {object[]}          The extended options Array including new context choices
 */
export function addChatMessageContextOptions(html, options) {
  let canApply = li => {
    const message = game.messages.get(li.data("messageId"));
    return message?.isRoll && message?.isContentVisible && canvas.tokens?.controlled.length;
  };
  options.push(
    {
      name: game.i18n.localize("DND5E.ChatContextDamage"),
      icon: '<i class="fas fa-user-minus"></i>',
      condition: canApply,
      callback: li => applyChatCardDamage(li, 1)
    },
    {
      name: game.i18n.localize("DND5E.ChatContextHealing"),
      icon: '<i class="fas fa-user-plus"></i>',
      condition: canApply,
      callback: li => applyChatCardDamage(li, -1)
    },
    {
      name: game.i18n.localize("DND5E.ChatContextTempHP"),
      icon: '<i class="fas fa-user-clock"></i>',
      condition: canApply,
      callback: li => applyChatCardTemp(li)
    },
    {
      name: game.i18n.localize("DND5E.ChatContextDoubleDamage"),
      icon: '<i class="fas fa-user-injured"></i>',
      condition: canApply,
      callback: li => applyChatCardDamage(li, 2)
    },
    {
      name: game.i18n.localize("DND5E.ChatContextHalfDamage"),
      icon: '<i class="fas fa-user-shield"></i>',
      condition: canApply,
      callback: li => applyChatCardDamage(li, 0.5)
    }
  );
  return options;
}

/* -------------------------------------------- */



function _getDamageType(flavorString) {
  const validDamageTypes = Object.entries(CONFIG.DND5E.damageTypes).deepFlatten().concat(Object.entries(CONFIG.DND5E.healingTypes).deepFlatten())
  const allDamageTypeEntries = Object.entries(CONFIG.DND5E.damageTypes).concat(Object.entries(CONFIG.DND5E.healingTypes));
  if (validDamageTypes.includes(flavorString)) {
    const damageEntry = allDamageTypeEntries?.find(e => e[1] === flavorString);
    return damageEntry ? damageEntry[0] : flavorString
  }
  return undefined;
}

function _getDamageFlavor(damageType) {
  const validDamageTypes = Object.entries(CONFIG.DND5E.damageTypes).deepFlatten().concat(Object.entries(CONFIG.DND5E.healingTypes).deepFlatten())
  const allDamageTypeEntries = Object.entries(CONFIG.DND5E.damageTypes).concat(Object.entries(CONFIG.DND5E.healingTypes));
  if (validDamageTypes.includes(damageType)) {
    const damageEntry = allDamageTypeEntries?.find(e => e[0] === damageType);
    return damageEntry ? damageEntry[1] : damageType
  }
  return undefined;
}


/**
 *  return a list of {damage: number, type: string} for the roll and the item
 */
function _createDamageList({ roll, item, versatile, defaultType = "none", ammo }) {
  const debugEnabled = 0;
  let damageParts = {};
  const rollTerms = roll.terms;
  let evalString = "";
  let parts = duplicate(item?.system.damage.parts ?? []);
  if (versatile && item?.system.damage.versatile) {
    parts[0][0] = item.system.damage.versatile;
  }
  if (ammo) parts = parts.concat(ammo.system.damage.parts)

  // create data for a synthetic roll
  let rollData = item ? item.getRollData() : {};
  rollData.mod = 0;
  if (debugEnabled > 1) debug("CreateDamageList: Passed roll is ", roll)
  if (debugEnabled > 1) debug("CreateDamageList: Damage spec is ", parts)
  let partPos = 0;
  const validDamageTypes = Object.entries(CONFIG.DND5E.damageTypes).deepFlatten().concat(Object.entries(CONFIG.DND5E.healingTypes).deepFlatten())
  const allDamageTypeEntries = Object.entries(CONFIG.DND5E.damageTypes).concat(Object.entries(CONFIG.DND5E.healingTypes));

  // If we have an item we can use it to work out each of the damage lines that are being rolled
  for (let [spec, type] of parts) { // each spec,type is one of the damage lines
    if (partPos >= rollTerms.length) continue;
    // TODO look at replacing this with a map/reduce
    if (debugEnabled > 1) debug("CreateDamageList: single Spec is ", spec, type, item)
    let formula = Roll.replaceFormulaData(spec, rollData, { missing: "0", warn: false });
    // TODO - need to do the .evaluate else the expression is not useful 
    // However will be a problem longer term when async not supported?? What to do
    let dmgSpec;
    try {
      // TODO Check if we actually have to to do the roll - intermeidate terms and simplifying the roll are the two bits to think about
      dmgSpec = new Roll(formula, rollData).evaluate({ async: false });
    } catch (err) {
      console.warn("midi-qol | Dmg spec not valid", formula)
      dmgSpec = undefined;
      break;
    }
    if (!dmgSpec || dmgSpec.terms?.length < 1) break;
    // dmgSpec is now a roll with the right terms (but nonsense value) to pick off the right terms from the passed roll
    // Because damage spec is rolled it drops the leading operator terms, so do that as well
    for (let i = 0; i < dmgSpec.terms.length; i++) { // grab all the terms for the current damage line
      // rolls can have extra operator terms if mods are negative so test is
      // if the current roll term is an operator but the next damage spec term is not 
      // add the operator term to the eval string and advance the roll term counter
      // eventually rollTerms[partPos] will become undefined so it can't run forever
      while (rollTerms[partPos] instanceof CONFIG.Dice.termTypes.OperatorTerm &&
        !(dmgSpec.terms[i] instanceof CONFIG.Dice.termTypes.OperatorTerm)) {
        evalString += rollTerms[partPos].operator + " ";
        partPos += 1;
      }
      if (rollTerms[partPos]) {
        const hasDivideMultiply = rollTerms[partPos + 1] instanceof OperatorTerm && ["/", "*"].includes(rollTerms[partPos + 1].operator);
        if (rollTerms[partPos] instanceof OperatorTerm) {
          evalString += rollTerms[partPos].operator + " ";
        }

        if (rollTerms[partPos] instanceof DiceTerm || rollTerms[partPos] instanceof NumericTerm) {
          const flavorDamageType = _getDamageType(rollTerms[partPos]?.options?.flavor);
          type = flavorDamageType ?? type;
          if (!rollTerms[partPos]?.options.flavor) {
            setProperty(rollTerms[partPos].options, "flavor", _getDamageFlavor(type));
          }

          evalString += rollTerms[partPos]?.total;
          if (!hasDivideMultiply) {
            // let result = Roll.safeEval(evalString);
            let result = new Roll(evalString).evaluate({ async: false }).total;
            damageParts[type || defaultType] = (damageParts[type || defaultType] || 0) + result;
            evalString = "";
          }
        }
        if (rollTerms[partPos] instanceof PoolTerm) {
          const flavorDamageType = _getDamageType(rollTerms[partPos]?.options?.flavor);
          type = flavorDamageType ?? type;
          if (!rollTerms[partPos]?.options.flavor) {
            setProperty(rollTerms[partPos].options, "flavor", _getDamageFlavor(type));
          }
          evalString += rollTerms[partPos]?.total;
        }
      }
      partPos += 1;
    }
    // Each damage line is added together and we can skip the operator term
    partPos += 1;
    if (evalString !== "") {
      // let result = Roll.safeEval(evalString);
      let result = new Roll(evalString).evaluate({ async: false }).total;

      damageParts[type || defaultType] = (damageParts[type || defaultType] || 0) + result;
      evalString = "";
    }
  }
  // We now have all of the item's damage lines (or none if no item)
  // Now just add up the other terms - using any flavor types for the rolls we get
  // we stepped one term too far so step back one
  partPos = Math.max(0, partPos - 1);

  // process the rest of the roll as a sequence of terms.
  // Each might have a damage flavour so we do them expression by expression

  evalString = "";
  let damageType = defaultType;
  let numberTermFound = false; // We won't evaluate until at least 1 numeric term is found
  while (partPos < rollTerms.length) {
    // Accumulate the text for each of the terms until we have enough to eval
    const evalTerm = rollTerms[partPos];
    partPos += 1;
    if (evalTerm instanceof DiceTerm) {
      // this is a dice roll
      damageType = _getDamageType(evalTerm.options?.flavor) ?? damageType;
      if (!evalTerm?.options.flavor) {
        setProperty(evalTerm, "options.flavor", _getDamageFlavor(damageType));
      }
      numberTermFound = true;
      evalString += evalTerm.total;
    } else if (evalTerm instanceof Die) { // special case for better rolls that does not return a proper roll
      damageType = _getDamageType(evalTerm.options?.flavor) ?? damageType;
      if (!evalTerm?.options.flavor) {
        setProperty(evalTerm, "options.flavor", _getDamageFlavor(damageType));
      }
      numberTermFound = true;
      evalString += evalTerm.total;
    } else if (evalTerm instanceof NumericTerm) {
      damageType = _getDamageType(evalTerm.options?.flavor) ?? damageType;
      if (!evalTerm?.options.flavor) {
        setProperty(evalTerm, "options.flavor", _getDamageFlavor(damageType));
      }
      numberTermFound = true;
      evalString += evalTerm.total;
    }
    if (evalTerm instanceof PoolTerm) {
      damageType = _getDamageType(evalTerm?.options?.flavor) ?? damageType;
      if (!evalTerm?.options.flavor) {
        setProperty(evalTerm, "options.flavor", _getDamageFlavor(damageType));
      }
      evalString += evalTerm.total;
    }
    if (evalTerm instanceof OperatorTerm) {
      if (["*", "/"].includes(evalTerm.operator)) {
        // multiply or divide keep going
        evalString += evalTerm.total
      } else if (["-", "+"].includes(evalTerm.operator)) {
        if (numberTermFound) { // we have a number and a +/- so we can eval the term (do it straight away so we get the right damage type)
          let result = Roll.safeEval(evalString);
          damageParts[damageType || defaultType] = (damageParts[damageType || defaultType] || 0) + result;
          // reset for the next term - we don't know how many there will be
          evalString = "";
          damageType = defaultType;
          numberTermFound = false;
          evalString = evalTerm.operator;
        } else { // what to do with parenthetical term or others?
          evalString += evalTerm.total;
        }
      }
    }
  }
  // evalString contains the terms we have not yet evaluated so do them now
  if (evalString) {
    const damage = Roll.safeEval(evalString);
    // we can always add since the +/- will be recorded in the evalString
    damageParts[damageType || defaultType] = (damageParts[damageType || defaultType] || 0) + damage;
  }
  const bypasses = Object.keys(CONFIG.DND5E.physicalWeaponProperties).filter(pwp=>item?.system.properties[pwp]);
  const damageList = Object.entries(damageParts).map(([type, damage]) => {
    if (Object.keys(CONFIG.DND5E.physicalDamageTypes).includes(type)) {
      return { damage, type, bypasses }
    } else {
      return { damage, type }
    }
  });
  if (debugEnabled > 1) debug("CreateDamageList: Final damage list is ", damageList);
  return damageList;
}

/**
 * Apply rolled dice damage to the token or tokens which are currently controlled.
 * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
 *
 * @param {HTMLElement} li      The chat entry which contains the roll data
 * @param {number} multiplier   A damage multiplier to apply to the rolled damage.
 * @returns {Promise}
 */
function applyChatCardDamage(li, multiplier) {
  const message = game.messages.get(li.data("messageId"));
  const roll = message.rolls[0];
  let itemPromise = new Promise((resolve, reject)=>{resolve(null);});
  if (message?.flags?.dnd5e?.roll?.itemUuid !== undefined) {
    itemPromise = fromUuid(message.flags.dnd5e.roll.itemUuid);
  }
  itemPromise.then((item)=>{
    const damageList = _createDamageList({
      roll: roll,
      item: item,
      versatile: message?.flags?.dnd5e?.roll?.versatile ?? false,
      ammo: null,
    });
    // find solution for non-magic weapons
    return Promise.all(canvas.tokens.controlled.map(t=>t.actor.applyTypedDamage(damageList, multiplier)));
  }, (rejection)=>{
    console.log(rejection);
  });
}

/* -------------------------------------------- */

/**
 * Apply rolled dice as temporary hit points to the controlled token(s).
 * @param {HTMLElement} li  The chat entry which contains the roll data
 * @returns {Promise}
 */
function applyChatCardTemp(li) {
  const message = game.messages.get(li.data("messageId"));
  const roll = message.rolls[0];
  return Promise.all(canvas.tokens.controlled.map(t => {
    const a = t.actor;
    return a.applyTempHP(roll.total);
  }));
}

/* -------------------------------------------- */

/**
 * Handle rendering of a chat message to the log
 * @param {ChatLog} app     The ChatLog instance
 * @param {jQuery} html     Rendered chat message HTML
 * @param {object} data     Data passed to the render context
 */
export function onRenderChatMessage(app, html, data) {
  displayChatActionButtons(app, html, data);
  highlightCriticalSuccessFailure(app, html, data);
  if (game.settings.get("dnd5e", "autoCollapseItemCards")) html.find(".card-content").hide();
}
