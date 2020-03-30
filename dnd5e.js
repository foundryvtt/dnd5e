/**
 * The Dungeons & Dragons 5th Edition game system for Foundry Virtual Tabletop
 * Author: Atropos
 * Software License: GNU GPLv3
 * Content License: https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf
 * Repository: https://gitlab.com/foundrynet/dnd5e
 * Issue Tracker: https://gitlab.com/foundrynet/dnd5e/issues
 */

// Import Modules
import { DND5E } from "./module/config.js";
import { registerSystemSettings } from "./module/settings.js";
import { preloadHandlebarsTemplates } from "./module/templates.js";
import { _getInitiativeFormula } from "./module/combat.js";
import { measureDistance, getBarAttribute } from "./module/canvas.js";
import { Actor5e } from "./module/actor/entity.js";
import { ActorSheet5eCharacter } from "./module/actor/sheets/character.js";
import { Item5e } from "./module/item/entity.js";
import { ItemSheet5e } from "./module/item/sheet.js";
import { ActorSheet5eNPC } from "./module/actor/sheets/npc.js";
import { Dice5e } from "./module/dice.js";
import * as chat from "./module/chat.js";
import * as migrations from "./module/migration.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
  console.log(`D&D5e | Initializing Dungeons & Dragons 5th Edition System\n${DND5E.ASCII}`);

  // Create a D&D5E namespace within the game global
  game.dnd5e = {
    Actor5e,
    Dice5e,
    Item5e,
    migrations,
    rollItemMacro
  };

  // Record Configuration Values
  CONFIG.DND5E = DND5E;
  CONFIG.Actor.entityClass = Actor5e;
  CONFIG.Item.entityClass = Item5e;

  // Register System Settings
  registerSystemSettings();

  // Patch Core Functions
  Combat.prototype._getInitiativeFormula = _getInitiativeFormula;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dnd5e", ActorSheet5eCharacter, { types: ["character"], makeDefault: true });
  Actors.registerSheet("dnd5e", ActorSheet5eNPC, { types: ["npc"], makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dnd5e", ItemSheet5e, {makeDefault: true});

  // Preload Handlebars Templates
  preloadHandlebarsTemplates();
});


/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

/**
 * This function runs after game data has been requested and loaded from the servers, so entities exist
 */
Hooks.once("setup", function() {

  // Localize CONFIG objects once up-front
  const toLocalize = [
    "abilities", "alignments", "conditionTypes", "consumableTypes", "currencies", "damageTypes", "distanceUnits", "equipmentTypes",
    "healingTypes", "itemActionTypes", "limitedUsePeriods", "senses", "skills", "spellComponents", "spellLevels", "spellPreparationModes",
    "spellSchools", "spellScalingModes", "targetTypes", "timePeriods", "weaponProperties", "weaponTypes", "languages"
  ];
  for ( let o of toLocalize ) {
    CONFIG.DND5E[o] = Object.entries(CONFIG.DND5E[o]).reduce((obj, e) => {
      obj[e[0]] = game.i18n.localize(e[1]);
      return obj;
    }, {});
  }
});

/* -------------------------------------------- */

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once("ready", function() {
  const NEEDS_MIGRATION_VERSION = 0.84;
  let needMigration = game.settings.get("dnd5e", "systemMigrationVersion") < NEEDS_MIGRATION_VERSION;
  if ( needMigration && game.user.isGM ) migrations.migrateWorld();

  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => create5eMacro(data, slot));
});

/* -------------------------------------------- */
/*  Canvas Initialization                       */
/* -------------------------------------------- */

Hooks.on("canvasInit", function() {

  // Extend Diagonal Measurement
  canvas.grid.diagonalRule = game.settings.get("dnd5e", "diagonalMovement");
  SquareGrid.prototype.measureDistance = measureDistance;

  // Extend Token Resource Bars
  Token.prototype.getBarAttribute = getBarAttribute;
});


/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

Hooks.on("renderChatMessage", (app, html, data) => {

  // Display action buttons
  chat.displayChatActionButtons(app, html, data);

  // Highlight critical success or failure die
  chat.highlightCriticalSuccessFailure(app, html, data);

  // Optionally collapse the content
  if (game.settings.get("dnd5e", "autoCollapseItemCards")) html.find(".card-content").hide();
});
Hooks.on("getChatLogEntryContext", chat.addChatMessageContextOptions);
Hooks.on("renderChatLog", (app, html, data) => Item5e.chatListeners(html));
Hooks.on('getActorDirectoryEntryContext', Actor5e.addDirectoryContextOptions);

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function create5eMacro(data, slot) {
  if ( data.type !== "Item" ) return;
  if (!( "data" in data ) ) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.data;

  // Create the macro command
  const command = `game.dnd5e.rollItemMacro("${item.name}");`;
  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
  if ( !macro ) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: {"dnd5e.itemMacro": true}
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if ( speaker.token ) actor = game.actors.tokens[speaker.token];
  if ( !actor ) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if ( !item ) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  if ( item.data.type === "spell" ) return actor.useSpell(item);
  return item.roll();
}
