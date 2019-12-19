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
import { _getInitiativeFormula, addChatMessageContextOptions } from "./module/combat.js";
import { measureDistance, getBarAttribute } from "./module/canvas.js";
import { highlightCriticalSuccessFailure } from "./module/dice.js";
import { Actor5e } from "./module/actor/entity.js";
import { ActorSheet5eCharacter } from "./module/actor/sheets/character.js";
import { Item5e } from "./module/item/entity.js";
import { ItemSheet5e } from "./module/item/sheet.js";
import { ActorSheet5eNPC } from "./module/actor/sheets/npc.js";
import * as migrations from "./module/migration.js";


/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log(`D&D5e | Initializing Dungeons & Dragons 5th Edition System\n${DND5E.ASCII}`);

  // Create a D&D5E namespace within the game global
  game.dnd5e = {
    migrations: migrations
  };

  // Record Configuration Values
  CONFIG.DND5E = DND5E;
  CONFIG.Actor.entityClass = Actor5e;
  CONFIG.Item.entityClass = Item5e;

  // Register System Settings
  registerSystemSettings();

  // Preload Handlebars Templates
  await preloadHandlebarsTemplates();

  // Patch Core Functions
  Combat.prototype._getInitiativeFormula = _getInitiativeFormula;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dnd5e", ActorSheet5eCharacter, { types: ["character"], makeDefault: true });
  Actors.registerSheet("dnd5e", ActorSheet5eNPC, { types: ["npc"], makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dnd5e", ItemSheet5e, {makeDefault: true});
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
    "spellSchools", "spellScalingModes", "targetTypes", "timePeriods", "weaponProperties", "weaponTypes"
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
  const NEEDS_MIGRATION_VERSION = 0.7;
  let needMigration = game.settings.get("dnd5e", "systemMigrationVersion") < NEEDS_MIGRATION_VERSION;
  if ( needMigration && game.user.isGM ) migrations.migrateWorld();
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

Hooks.on("renderChatMessage", highlightCriticalSuccessFailure);
Hooks.on("getChatLogEntryContext", addChatMessageContextOptions);
Hooks.on("renderChatLog", (app, html, data) => Item5e.chatListeners(html));
