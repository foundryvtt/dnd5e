import { simplifyBonus } from "./utils.mjs";
import { damageRoll } from "./dice/_module.mjs";
import * as Trait from "./documents/actor/trait.mjs";

/**
 * Set up the custom text enricher.
 */
export function registerCustomEnrichers() {
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[\[\/(?<type>check|damage|save|skill|tool|item) (?<config>[^\]]+)]](?:{(?<label>[^}]+)})?/gi,
    enricher: enrichString
  });

  document.body.addEventListener("click", rollAction);
}

/* -------------------------------------------- */

/**
 * Parse the enriched string and provide the appropriate content.
 * @param {RegExpMatchArray} match       The regular expression match result.
 * @param {EnrichmentOptions} options    Options provided to customize text enrichment.
 * @returns {Promise<HTMLElement|null>}  An HTML element to insert in place of the matched text or null to
 *                                       indicate that no replacement should be made.
 */
async function enrichString(match, options) {
  let { type, config, label } = match.groups;
  config = parseConfig(config, match.input);
  config.input = match[0];
  switch ( type.toLowerCase() ) {
    case "damage": return enrichDamage(config, label, options);
    case "check":
    case "skill":
    case "tool": return enrichCheck(config, label, options);
    case "save": return enrichSave(config, label, options);
    case "item": return enrichItem(config, label);
  }
  return match.input;
}

/* -------------------------------------------- */

/**
 * Parse a roll string into a configuration object.
 * @param {string} match  Matched configuration string.
 * @returns {object}
 */
function parseConfig(match) {
  const config = { values: [] };
  for ( const part of match.split(" ") ) {
    if ( !part ) continue;
    const [key, value] = part.split("=");
    const valueLower = value?.toLowerCase();
    if ( value === undefined ) config.values.push(key);
    else if ( ["true", "false"].includes(valueLower) ) config[key] = valueLower === "true";
    else if ( Number.isNumeric(value) ) config[key] = Number(value);
    else config[key] = value;
  }
  return config;
}

/* -------------------------------------------- */
/*  Enrichers                                   */
/* -------------------------------------------- */

/**
 * Enrich an ability check link to perform a specific ability or skill check. If an ability is provided
 * along with a skill, then the skill check will always use the provided ability. Otherwise it will use
 * the character's default ability for that skill.
 * @param {string[]} config            Configuration data.
 * @param {string} [label]             Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML link if the check could be built, otherwise null.
 *
 * @example Create a dexterity check:
 * ```[[/check ability=dex]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="check" data-ability="dex">
 *   <i class="fa-solid fa-dice-d20"></i> Dexterity check
 * </a>
 * ```
 *
 * @example Create an acrobatics check with a DC and default ability:
 * ```[[/check skill=acr dc=20]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="check" data-skill="acr" data-dc="20">
 *   <i class="fa-solid fa-dice-d20"></i> DC 20 Dexterity (Acrobatics) check
 * </a>
 * ```
 *
 * @example Create an acrobatics check using strength:
 * ```[[/check ability=str skill=acr]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="check" data-ability="str" data-skill="acr">
 *   <i class="fa-solid fa-dice-d20"></i> Strength (Acrobatics) check
 * </a>
 * ```
 *
 * @example Create a tool check:
 * ```[[/check tool=thief ability=int]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="check" data-ability="int" data-tool="thief">
 *   <i class="fa-solid fa-dice-d20"></i> Intelligence (Thieves' Tools) check
 * </a>
 * ```
 *
 * @example Formulas used for DCs will be resolved using data provided to the description (not the roller):
 * ```[[/check ability=cha dc=@abilities.int.dc]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="check" data-ability="cha" data-dc="15">
 *   <i class="fa-solid fa-dice-d20"></i> DC 15 Charisma check
 * </a>
 * ```
 */
async function enrichCheck(config, label, options) {
  for ( const value of config.values ) {
    if ( value in CONFIG.DND5E.enrichmentLookup.abilities ) config.ability = value;
    else if ( value in CONFIG.DND5E.enrichmentLookup.skills ) config.skill = value;
    else if ( value in CONFIG.DND5E.enrichmentLookup.tools ) config.tool = value;
    else if ( Number.isNumeric(value) ) config.dc = Number(value);
    else config[value] = true;
  }

  let invalid = false;

  const skillConfig = CONFIG.DND5E.enrichmentLookup.skills[config.skill];
  if ( config.skill && !skillConfig ) {
    console.warn(`Skill ${config.skill} not found while enriching ${config.input}.`);
    invalid = true;
  } else if ( config.skill && !config.ability ) {
    config.ability = skillConfig.ability;
  }
  if ( skillConfig?.key ) config.skill = skillConfig.key;

  const toolUUID = CONFIG.DND5E.enrichmentLookup.tools[config.tool];
  const toolIndex = toolUUID ? Trait.getBaseItem(toolUUID, { indexOnly: true }) : null;
  if ( config.tool && !toolIndex ) {
    console.warn(`Tool ${config.tool} not found while enriching ${config.input}.`);
    invalid = true;
  }

  let abilityConfig = CONFIG.DND5E.enrichmentLookup.abilities[config.ability];
  if ( config.ability && !abilityConfig ) {
    console.warn(`Ability ${config.ability} not found while enriching ${config.input}.`);
    invalid = true;
  } else if ( !abilityConfig ) {
    console.warn(`No ability provided while enriching check ${config.input}.`);
    invalid = true;
  }
  if ( abilityConfig?.key ) config.ability = abilityConfig.key;

  if ( config.dc && !Number.isNumeric(config.dc) ) config.dc = simplifyBonus(config.dc, options.rollData ?? {});

  if ( invalid ) return config.input;

  const type = config.skill ? "skill" : config.tool ? "tool" : "check";
  config = { type, ...config };
  if ( !label ) label = createRollLabel(config);
  return config.passive ? createPassiveTag(label, config) : createRollLink(label, config);
}

/* -------------------------------------------- */

/**
 * Enrich a damage link.
 * @param {string[]} config            Configuration data.
 * @param {string} [label]             Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML link if the save could be built, otherwise null.
 *
 * @example Create a damage link:
 * ```[[/damage 2d6 type=bludgeoning]]``
 * becomes
 * ```html
 * <a class="roll-action" data-type="damage" data-formula="2d6" data-damage-type="bludgeoning">
 *   <i class="fa-solid fa-dice-d20"></i> 2d6
 * </a> bludgeoning
 * ````
 *
 * @example Display the average:
 * ```[[/damage 2d6 type=bludgeoning average=true]]``
 * becomes
 * ```html
 * 7 (<a class="roll-action" data-type="damage" data-formula="2d6" data-damage-type="bludgeoning">
 *   <i class="fa-solid fa-dice-d20"></i> 2d6
 * </a>) bludgeoning
 * ````
 *
 * @example Manually set the average & don't prefix the type:
 * ```[[/damage 8d4dl force average=666]]``
 * becomes
 * ```html
 * 666 (<a class="roll-action" data-type="damage" data-formula="8d4dl" data-damage-type="force">
 *   <i class="fa-solid fa-dice-d20"></i> 8d4dl
 * </a> force
 * ````
 */
async function enrichDamage(config, label, options) {
  const formulaParts = [];
  if ( config.formula ) formulaParts.push(config.formula);
  for ( const value of config.values ) {
    if ( value in CONFIG.DND5E.damageTypes ) config.type = value;
    else if ( value === "average" ) config.average = true;
    else formulaParts.push(value);
  }
  config.formula = Roll.defaultImplementation.replaceFormulaData(formulaParts.join(" "), options.rollData ?? {});
  if ( !config.formula ) return null;
  config.damageType = config.type;
  config.type = "damage";

  if ( label ) return createRollLink(label, config);

  const localizationData = {
    formula: createRollLink(config.formula, config).outerHTML,
    type: game.i18n.localize(CONFIG.DND5E.damageTypes[config.damageType] ?? "").toLowerCase()
  };

  let localizationType = "Short";
  if ( config.average ) {
    localizationType = "Long";
    if ( config.average === true ) {
      const minRoll = Roll.create(config.formula).evaluate({ minimize: true, async: true });
      const maxRoll = Roll.create(config.formula).evaluate({ maximize: true, async: true });
      localizationData.average = Math.floor((await minRoll.total + await maxRoll.total) / 2);
    } else if ( Number.isNumeric(config.average) ) {
      localizationData.average = config.average;
    }
  }

  const span = document.createElement("span");
  span.innerHTML = game.i18n.format(`EDITOR.DND5E.Inline.Damage${localizationType}`, localizationData);
  return span;
}

/* -------------------------------------------- */

/**
 * Enrich a saving throw link.
 * @param {string[]} config            Configuration data.
 * @param {string} [label]             Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML link if the save could be built, otherwise null.
 *
 * @example Create a dexterity saving throw:
 * ```[[/save ability=dex]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="save" data-key="dex">
 *   <i class="fa-solid fa-dice-d20"></i> Dexterity
 * </a>
 * ```
 *
 * @example Add a DC to the save:
 * ```[[/save ability=dex dc=20]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="save" data-key="dex" data-dc="20">
 *   <i class="fa-solid fa-dice-d20"></i> DC 20 Dexterity
 * </a>
 * ```
 */
async function enrichSave(config, label, options) {
  for ( const value of config.values ) {
    if ( value in CONFIG.DND5E.enrichmentLookup.abilities ) config.ability = value;
    else if ( Number.isNumeric(value) ) config.dc = Number(value);
    else config[value] = true;
  }

  const abilityConfig = CONFIG.DND5E.enrichmentLookup.abilities[config.ability];
  if ( !abilityConfig ) {
    console.warn(`Ability ${config.ability} not found while enriching ${config.input}.`);
    return config.input;
  }
  if ( abilityConfig?.key ) config.ability = abilityConfig.key;

  if ( config.dc && !Number.isNumeric(config.dc) ) config.dc = simplifyBonus(config.dc, options.rollData ?? {});

  config = { type: "save", ...config };
  if ( !label ) label = createRollLabel(config);
  return createRollLink(label, config);
}

/* -------------------------------------------- */

/**
 * Enrich an item use link to roll an item on the selected token.
 * @param {string[]} config            Configuration data.
 * @param {string} [label]             Optional label to replace default text.
 * @returns {HTMLElement|null}         An HTML link if the item link could be built, otherwise null.
 *
 * @example Use an item from a Name:
 * ```[[/item Heavy Crossbow]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="item">
 *   <i class="fa-solid fa-dice-d20"></i> Heavy Crossbow
 * </a>
 * ```
 *
 * @example Use an Item from a UUID:
 * ```[[/item Actor.M4eX4Mu5IHCr3TMf.Item.amUUCouL69OK1GZU]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="item">
 *   <i class="fa-solid fa-dice-d20"></i> Bite
 * </a>
 * ```
 *
 * @example Use an Item from a "Name UUID":
 * ```[[/item Actor.Akra (Dragonborn Cleric).Item.Mace]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="item">
 *   <i class="fa-solid fa-dice-d20"></i> Mace
 * </a>
 * ```
 *
 * @example Use an Item from a Relative UUID:
 * ```[[/item .amUUCouL69OK1GZU]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="item">
 *   <i class="fa-solid fa-dice-d20"></i> Bite
 * </a>
 * ```
 */
async function enrichItem(config, label) {
  const givenItem = config.values.join(" ");
  // If config is a UUID
  const itemUuidMatch = givenItem.match(/^Actor\..*?\.Item\..*?$/);
  if (itemUuidMatch) {
    const actorIdOrName = itemUuidMatch[0].split(".")[1];
    const ownerActor = game.actors.get(actorIdOrName) || game.actors.getName(actorIdOrName);
    if (ownerActor) {
      const itemIdOrName = itemUuidMatch[0].split(".")[3];
      const ownedItem = ownerActor.items.get(itemIdOrName) || ownerActor.items.getName(itemIdOrName);
      if (!ownedItem) {
        console.warn(`Item ${itemIdOrName} not found while enriching ${config.input}.`);
        return config.input;
      } else if ( !label ) {
        label = ownedItem.name;
      }
      return createRollLink(label, {type: "item", rollItemActor: ownerActor.id, rollItemId: ownedItem.id });
    }
  }

  // If config is a relative ID
  const relativeIdMatch = givenItem.match(/^\.\w{16}$/);
  const copiedIdMatch = givenItem.match(/^\w{16}$/);
  const relativeNameMatch = givenItem.startsWith(".");
  if (relativeIdMatch || copiedIdMatch || relativeNameMatch) {
    const relativeId = relativeIdMatch ? givenItem.substr(1) : givenItem;
    const foundActor = game.actors.find(actor => actor.items.get(relativeId));
    if (foundActor) {
      const foundItem = foundActor.items.get(relativeId);
      if ( !label ) {
        label = foundItem.name;
        console.log(`Found actor ${foundActor.name} that owns the item ${foundItem.name}.`);
      }
      return createRollLink(label, { type: "item", rollRelativeItemId: relativeId });
    } else if (relativeNameMatch) {
      const relativeName = givenItem.substr(1);
      if (!label) {
        label = relativeName;
        return createRollLink(label, { type: "item", rollRelativeItemName: relativeName });
      }
    }
  }

  // Finally, if config is an item name
  if ( !label ) {
    label = givenItem;}
  return createRollLink(label, { type: "item", rollItemName: givenItem });
}

/* -------------------------------------------- */

/**
 * Add a dataset object to the provided element.
 * @param {HTMLElement} element  Element to modify.
 * @param {object} dataset       Data properties to add.
 * @private
 */
function _addDataset(element, dataset) {
  for ( const [key, value] of Object.entries(dataset) ) {
    if ( !["input", "values"].includes(key) && value ) element.dataset[key] = value;
  }
}

/* -------------------------------------------- */

/**
 * Create a passive skill tag.
 * @param {string} label    Label to display.
 * @param {object} dataset  Data that will be added to the tag.
 * @returns {HTMLElement}
 */
function createPassiveTag(label, dataset) {
  const span = document.createElement("span");
  span.classList.add("passive-check");
  _addDataset(span, dataset);
  span.innerText = label;
  return span;
}

/* -------------------------------------------- */

/**
 * Create a label for a roll message.
 * @param {object} config  Enrichment configuration data.
 * @returns {string}
 */
function createRollLabel(config) {
  const ability = CONFIG.DND5E.abilities[config.ability]?.label;
  const skill = CONFIG.DND5E.skills[config.skill]?.label;
  const toolUUID = CONFIG.DND5E.enrichmentLookup.tools[config.tool];
  const tool = toolUUID ? Trait.getBaseItem(toolUUID, { indexOnly: true })?.name : null;
  const longSuffix = config.format === "long" ? "Long" : "Short";

  let label;
  switch ( config.type ) {
    case "check":
    case "skill":
    case "tool":
      if ( ability && (skill || tool) ) {
        label = game.i18n.format("EDITOR.DND5E.Inline.SpecificCheck", { ability, type: skill ?? tool });
      } else {
        label = ability;
      }
      if ( config.passive ) {
        label = game.i18n.format(`EDITOR.DND5E.Inline.DCPassive${longSuffix}`, { dc: config.dc, check: label });
      } else {
        if ( config.dc ) label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc: config.dc, check: label });
        label = game.i18n.format(`EDITOR.DND5E.Inline.Check${longSuffix}`, { check: label });
      }
      break;
    case "save":
      label = ability;
      if ( config.dc ) label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc: config.dc, check: label });
      label = game.i18n.format(`EDITOR.DND5E.Inline.Save${longSuffix}`, { save: label });
      break;
    default:
      return "";
  }

  return label;
}

/* -------------------------------------------- */

/**
 * Create a rollable link.
 * @param {string} label    Label to display.
 * @param {object} dataset  Data that will be added to the link for the rolling method.
 * @returns {HTMLElement}
 */
function createRollLink(label, dataset) {
  const span = document.createElement("span");
  span.classList.add("roll-link");
  _addDataset(span, dataset);

  // Add main link
  const link = document.createElement("a");
  link.dataset.action = "roll";
  link.innerHTML = `<i class="fa-solid fa-dice-d20"></i> ${label}`;
  span.insertAdjacentElement("afterbegin", link);

  // Add chat request link for GMs
  if ( game.user.isGM && (dataset.type !== "damage" && dataset.type !== "item") ) {
    const gmLink = document.createElement("a");
    gmLink.dataset.action = "request";
    gmLink.dataset.tooltip = "EDITOR.DND5E.Inline.RequestRoll";
    gmLink.setAttribute("aria-label", game.i18n.localize(gmLink.dataset.tooltip));
    gmLink.innerHTML = '<i class="fa-solid fa-comment-dots"></i>';
    span.insertAdjacentElement("beforeend", gmLink);
  }

  return span;
}

/* -------------------------------------------- */
/*  Actions                                     */
/* -------------------------------------------- */

/**
 * Perform the provided roll action.
 * @param {Event} event  The click event triggering the action.
 * @returns {Promise|void}
 */
async function rollAction(event) {
  const target = event.target.closest('.roll-link, [data-action="rollRequest"]');
  if ( !target ) return;
  event.stopPropagation();

  const { type, ability, skill, tool, dc } = target.dataset;
  const options = { event };
  if ( dc ) options.targetValue = dc;

  const action = event.target.closest("a")?.dataset.action ?? "roll";

  // Direct roll
  if ( (action === "roll") || !game.user.isGM ) {
    // Fetch the actor that should perform the roll
    let actor;
    const speaker = ChatMessage.implementation.getSpeaker();
    if ( speaker.token ) actor = game.actors.tokens[speaker.token];
    actor ??= game.actors.get(speaker.actor);
    if ( !actor && (type !== "damage" && type !== "item") ) {
      ui.notifications.warn(game.i18n.localize("EDITOR.DND5E.Inline.NoActorWarning"));
      return;
    }

    switch ( type ) {
      case "check":
        return actor.rollAbilityTest(ability, options);
      case "damage":
        return rollDamage(event, speaker);
      case "save":
        return actor.rollAbilitySave(ability, options);
      case "skill":
        if ( ability ) options.ability = ability;
        return actor.rollSkill(skill, options);
      case "tool":
        options.ability = ability;
        return actor.rollToolCheck(tool, options);
      case "item":
        // UUID Method
        if (target.dataset.rollItemActor) {
          const gameActor = game.actors.get(target.dataset.rollItemActor);
          if (gameActor.testUserPermission(game.user, "OWNER")) {
            return gameActor.items.get(target.dataset.rollItemId).use();
          } else {
            return ui.notifications.warn(`You do not have ownership of ${gameActor.name}, and cannot use this item!`);
          }

        // Relative Id Method
        } else if (target.dataset.rollRelativeItemId || target.dataset.rollRelativeItemName) {
          let locatedToken; let locatedScene; let locatedActor;
          const targetLocation = target.parentElement.parentElement;
          if (targetLocation.classList.contains("card-content")) {
            const chatCardIds = target.closest(".dnd5e.chat-card.item-card").dataset;
            if (chatCardIds.tokenId) {
              const chatIds = chatCardIds.tokenId.match(/Scene\.(.{16}).Token\.(.{16})/);
              locatedScene = chatIds[1];
              locatedToken = chatIds[2];
            } else {
              locatedActor = chatCardIds.actorId;
            }

          } else if (targetLocation.classList.contains("item-summary")) {
            const actorSheetIds = target.closest(".app.window-app.dnd5e.sheet.actor").id.match(/ActorSheet5e(?:NPC|Character)-(Scene-(.{16}))?(-Token-(.{16}))?(-Actor-(.{16}))?/);
            if (actorSheetIds[2]) {
              locatedScene = actorSheetIds[2];
              locatedToken = actorSheetIds[4];
            } else {
              locatedActor = event.target.offsetParent.id.slice(-16);
            }

          } else if (targetLocation.classList.contains("editor-content")) {
            const itemSheetIds = target.closest(".app.window-app.dnd5e.sheet.item").id.match(/ItemSheet5e-(Scene-(.{16}))?(-Token-(.{16}))?(Actor-(.{16}))?/);
            if (itemSheetIds[2]) {
              locatedScene = itemSheetIds[2];
              locatedToken = itemSheetIds[4];
            } else {
              locatedActor = itemSheetIds[6];
            }
          }

          if (locatedActor) {
            const gameActor = game.actors.get(locatedActor);
            const actorItem = gameActor.items.get(target.dataset.rollRelativeItemId) || gameActor.items.getName(target.dataset.rollRelativeItemName);
            if (actorItem) {
              if (gameActor.testUserPermission(game.user, "OWNER")) {
                return actorItem.use();
              } else {
                return ui.notifications.warn(`You do not have ownership of ${gameActor.name}, and cannot use this item!`);
              }
            }
            else return ui.notifications.warn(`Item ${target.dataset.rollRelativeItemId || target.dataset.rollRelativeItemName} not found on Actor ${gameActor.name}!`);
          } else {
            const parentScene = game.scenes.get(locatedScene);
            const sceneToken = parentScene.collections.tokens.get(locatedToken);
            const tokenItem = sceneToken.delta.collections.items.get(target.dataset.rollRelativeItemId) || sceneToken.delta.collections.items.getName(target.dataset.rollRelativeItemName);
            if (tokenItem) {
              if (sceneToken.actor.testUserPermission(game.user, "OWNER")) {
                return tokenItem.use();
              } else {
                return ui.notifications.warn(`You do not have ownership of ${sceneToken.name}, and cannot use this item!`);
              }
            }
            else return ui.notifications.warn(`Item ${target.dataset.rollRelativeItemId || target.dataset.rollRelativeItemName} not found on Token ${sceneToken.name} in Scene ${parentScene.name}!`);
          }

        // Name Method
        } else if (target.dataset.rollItemName) {
          return dnd5e.documents.macro.rollItem(target.dataset.rollItemName);
        }
      default:
        return console.warn(`DnD5e | Unknown roll type ${type} provided.`);
    }
  }

  // Roll request
  else {
    const MessageClass = getDocumentClass("ChatMessage");
    const chatData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: await renderTemplate("systems/dnd5e/templates/chat/request-card.hbs", {
        buttonLabel: createRollLabel({ ...target.dataset, format: "short" }),
        dataset: { ...target.dataset, action: "rollRequest" }
      }),
      flavor: game.i18n.localize("EDITOR.DND5E.Inline.RollRequest"),
      speaker: MessageClass.getSpeaker({user: game.user})
    };
    return MessageClass.create(chatData);
  }
}

/* -------------------------------------------- */

/**
 * Perform a damage roll.
 * @param {Event} event              The click event triggering the action.
 * @param {TokenDocument} [speaker]  Currently selected token, if one exists.
 * @returns {Promise|void}
 */
async function rollDamage(event, speaker) {
  const target = event.target.closest(".roll-link");
  const { formula, damageType } = target.dataset;

  const title = game.i18n.localize("DND5E.DamageRoll");
  const messageData = { "flags.dnd5e.roll.type": "damage", speaker };
  const rollConfig = {
    parts: [formula],
    flavor: `${title} (${game.i18n.localize(CONFIG.DND5E.damageTypes[damageType] ?? damageType)})`,
    event,
    title,
    messageData
  };

  if ( Hooks.call("dnd5e.preRollDamage", undefined, rollConfig) === false ) return;
  const roll = await damageRoll(rollConfig);
  if ( roll ) Hooks.callAll("dnd5e.rollDamage", undefined, roll);
}
