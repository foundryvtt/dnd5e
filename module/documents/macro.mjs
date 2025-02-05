/**
 * Attempt to create a macro from the dropped data. Will use an existing macro if one exists.
 * @param {object} dropData     The dropped data
 * @param {number} slot         The hotbar slot to use
 * @returns {Promise}
 */
export async function create5eMacro(dropData, slot) {
  const macroData = { type: "script", scope: "actor" };
  switch ( dropData.type ) {
    case "Activity":
      const activity = await fromUuid(dropData.uuid);
      if ( !activity ) {
        ui.notifications.warn("MACRO.5eUnownedWarn", { localize: true });
        return null;
      }
      foundry.utils.mergeObject(macroData, {
        name: `${activity.item.name}: ${activity.name}`,
        img: activity.img,
        command: `dnd5e.documents.macro.rollItem("${activity.item._source.name}", { activityName: "${
          activity._source.name}", event });`,
        flags: { "dnd5e.itemMacro": true }
      });
      break;
    case "Item":
      const itemData = await Item.implementation.fromDropData(dropData);
      if ( !itemData ) {
        ui.notifications.warn("MACRO.5eUnownedWarn", { localize: true });
        return null;
      }
      foundry.utils.mergeObject(macroData, {
        name: itemData.name,
        img: itemData.img,
        command: `dnd5e.documents.macro.rollItem("${itemData._source.name}", { event })`,
        flags: { "dnd5e.itemMacro": true }
      });
      break;
    case "ActiveEffect":
      const effectData = await ActiveEffect.implementation.fromDropData(dropData);
      if ( !effectData ) {
        ui.notifications.warn("MACRO.5eUnownedWarn", { localize: true });
        return null;
      }
      foundry.utils.mergeObject(macroData, {
        name: effectData.name,
        img: effectData.img,
        command: `dnd5e.documents.macro.toggleEffect("${effectData.name}")`,
        flags: { "dnd5e.effectMacro": true }
      });
      break;
    default:
      return;
  }

  // Assign the macro to the hotbar
  const macro = game.macros.find(m => {
    return (m.name === macroData.name) && (m.command === macroData.command) && m.isAuthor;
  }) || await Macro.create(macroData);
  game.user.assignHotbarMacro(macro, slot);
}

/* -------------------------------------------- */

/**
 * Find a document of the specified name and type on an assigned or selected actor.
 * @param {string} name          Document name to locate.
 * @param {string} documentType  Type of embedded document (e.g. "Item" or "ActiveEffect").
 * @returns {Document}           Document if found, otherwise nothing.
 */
function getMacroTarget(name, documentType) {
  let actor;
  const speaker = ChatMessage.getSpeaker();
  if ( speaker.token ) actor = game.actors.tokens[speaker.token];
  actor ??= game.actors.get(speaker.actor);
  if ( !actor ) {
    ui.notifications.warn("MACRO.5eNoActorSelected", {localize: true});
    return null;
  }

  const collection = (documentType === "Item") ? actor.items : Array.from(actor.allApplicableEffects());

  // Find item in collection
  const documents = collection.filter(i => i._source.name === name);
  const type = game.i18n.localize(`DOCUMENT.${documentType}`);
  if ( documents.length === 0 ) {
    ui.notifications.warn(game.i18n.format("MACRO.5eMissingTargetWarn", { actor: actor.name, type, name }));
    return null;
  }
  if ( documents.length > 1 ) {
    ui.notifications.warn(game.i18n.format("MACRO.5eMultipleTargetsWarn", { actor: actor.name, type, name }));
  }
  return documents[0];
}

/* -------------------------------------------- */

/**
 * Trigger an item to be used when a macro is clicked.
 * @param {string} itemName                Name of the item on the selected actor to trigger.
 * @param {object} [options={}]
 * @param {string} [options.activityName]  Name of a specific activity on the item to trigger.
 * @param {Event} [options.event]          The triggering event.
 * @returns {Promise<ChatMessage|object>}  Usage result.
 */
export function rollItem(itemName, { activityName, event }={}) {
  let target = getMacroTarget(itemName, "Item");
  if ( activityName ) target = target?.system.activities?.getName(activityName);
  return target?.use({ event, legacy: false });
}

/* -------------------------------------------- */

/**
 * Toggle an effect on and off when a macro is clicked.
 * @param {string} effectName        Name of the effect to be toggled.
 * @returns {Promise<ActiveEffect>}  The effect after it has been toggled.
 */
export function toggleEffect(effectName) {
  const effect = getMacroTarget(effectName, "ActiveEffect");
  return effect?.update({ disabled: !effect.disabled });
}
