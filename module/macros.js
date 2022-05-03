/**
 * Attempt to create a macro from the dropped data. Will use an existing macro if one exists.
 * @param {object} data         The dropped data
 * @param {number} slot         The hotbar slot to use
 * @returns {Promise<boolean>}
 */
export async function create5eMacro(data, slot) {
  const macroData = { type: "script", scope: "actor" };
  switch ( data.type ) {
    case "Item":
      if ( !("data" in data) ) return ui.notifications.warn(game.i18n.localize("MACRO.5eUnownedWarn"));
      foundry.utils.mergeObject(macroData, {
        name: data.data.name,
        img: data.data.img,
        command: `game.dnd5e.macros.rollItem("${data.data.name}")`,
        flags: {"dnd5e.itemMacro": true}
      });
      break;
    case "ActiveEffect":
      if ( !("data" in data) ) return ui.notifications.warn(game.i18n.localize("MACRO.5eUnownedWarn"));
      foundry.utils.mergeObject(macroData, {
        name: data.data.label,
        img: data.data.icon,
        command: `game.dnd5e.macros.toggleEffect("${data.data.label}")`,
        flags: {"dnd5e.effectMacro": true}
      });
      break;
    default:
      return;
  }

  let macro = game.macros.find(m => (m.data.name === macroData.name)
    && (m.data.command === macroData.command) && (m.data.author === game.userId));
  if ( !macro ) macro = await Macro.create(macroData);
  game.user.assignHotbarMacro(macro, slot);
  return false;
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
  if ( !actor ) return ui.notifications.warn(game.i18n.localize("MACRO.5eNoActorSelected"));

  const collection = (documentType === "Item") ? actor.items : actor.effects;
  const nameKeyPath = (documentType === "Item") ? "name" : "data.label";

  // Find item in collection
  const documents = collection.filter(i => foundry.utils.getProperty(i, nameKeyPath) === name);
  const type = game.i18n.localize(`DOCUMENT.${documentType}`);
  if ( documents.length === 0 ) {
    return ui.notifications.warn(game.i18n.format("MACRO.5eMissingTargetWarn", { actor: actor.name, type, name }));
  }
  if ( documents.length > 1 ) {
    ui.notifications.warn(game.i18n.format("MACRO.5eMultipleTargetsWarn", { actor: actor.name, type, name }));
  }

  return documents[0];
}

/* -------------------------------------------- */

/**
 * Trigger an item to roll when a macro is clicked.
 * @param {string} itemName                Name of the item on the selected actor to trigger.
 * @returns {Promise<ChatMessage|object>}  Roll result.
 */
export function rollItem(itemName) {
  return getMacroTarget(itemName, "Item")?.roll();
}

/* -------------------------------------------- */

/**
 * Toggle an effect on and off when a macro is clicked.
 * @param {string} effectLabel       Label for the effect to be toggled.
 * @returns {Promise<ActiveEffect>}  The effect after it has been toggled.
 */
export function toggleEffect(effectLabel) {
  const effect = getMacroTarget(effectLabel, "ActiveEffect");
  if ( !effect ) return;
  return effect.update({disabled: !effect.data.disabled});
}
