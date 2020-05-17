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
import { measureDistances, getBarAttribute } from "./module/canvas.js";

// Import Entities
import { Actor5e } from "./module/actor/entity.js";
import { Item5e } from "./module/item/entity.js";

// Import Applications
import { AbilityTemplate } from "./module/pixi/ability-template.js";
import { ActorSheetFlags } from "./module/apps/actor-flags.js";
import { ActorSheet5eCharacter } from "./module/actor/sheets/character.js";
import { ActorSheet5eNPC } from "./module/actor/sheets/npc.js";
import { ItemSheet5e } from "./module/item/sheet.js";
import { ShortRestDialog } from "./module/apps/short-rest.js";
import { TraitSelector } from "./module/apps/trait-selector.js";

// Import Helpers
import * as chat from "./module/chat.js";
import { Dice5e } from "./module/dice.js";
import * as migrations from "./module/migration.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
  console.log(`D&D5e | Initializing Dungeons & Dragons 5th Edition System\n${DND5E.ASCII}`);

  // Create a D&D5E namespace within the game global
  game.dnd5e = {
    applications: {
      ActorSheetFlags,
      ActorSheet5eCharacter,
      ActorSheet5eNPC,
      ItemSheet5e,
      ShortRestDialog,
      TraitSelector
    },
    canvas: {
      AbilityTemplate
    },
    config: DND5E,
    dice: {
      Dice5e,
      rollItemMacro
    },
    entities: {
      Actor5e,
      Item5e,
    },
    migrations: migrations,
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
    "abilities", "alignments", "conditionTypes", "consumableTypes", "currencies", "damageTypes", "distanceUnits",
    "equipmentTypes", "healingTypes", "itemActionTypes", "limitedUsePeriods", "senses", "skills", "spellComponents",
    "spellLevels", "spellPreparationModes", "spellSchools", "spellScalingModes", "targetTypes", "timePeriods",
    "weaponProperties", "weaponTypes", "languages", "polymorphSettings", "armorProficiencies", "weaponProficiencies",
    "toolProficiencies", "abilityActivationTypes", "abilityConsumptionTypes", "actorSizes", "proficiencyLevels"
  ];

  // Exclude some from sorting where the default order matters
  const noSort = [
    "abilities", "alignments", "currencies", "distanceUnits", "itemActionTypes", "proficiencyLevels",
    "limitedUsePeriods", "spellComponents", "spellLevels", "weaponTypes"
  ];

  // Localize and sort CONFIG objects
  for ( let o of toLocalize ) {
    const localized = Object.entries(CONFIG.DND5E[o]).map(e => {
      return [e[0], game.i18n.localize(e[1])];
    });
    if ( !noSort.includes(o) ) localized.sort((a, b) => a[1].localeCompare(b[1]));
    CONFIG.DND5E[o] = localized.reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {});
  }
});

/* -------------------------------------------- */

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once("ready", function() {

  // Determine whether a system migration is required and feasible
  const currentVersion = game.settings.get("dnd5e", "systemMigrationVersion");
  const NEEDS_MIGRATION_VERSION = 0.84;
  const COMPATIBLE_MIGRATION_VERSION = 0.80;
  let needMigration = (currentVersion < NEEDS_MIGRATION_VERSION) || (currentVersion === null);

  // Perform the migration
  if ( needMigration && game.user.isGM ) {
    if ( currentVersion && (currentVersion < COMPATIBLE_MIGRATION_VERSION) ) {
      ui.notifications.error(`Your D&D5E system data is from too old a Foundry version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`, {permanent: true});
    }
    migrations.migrateWorld();
  }

  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => create5eMacro(data, slot));
});

/* -------------------------------------------- */
/*  Canvas Initialization                       */
/* -------------------------------------------- */

Hooks.on("canvasInit", function() {

  // Extend Diagonal Measurement
  canvas.grid.diagonalRule = game.settings.get("dnd5e", "diagonalMovement");
  SquareGrid.prototype.measureDistances = measureDistances;

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

/* -------------------------------------------- */

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

  // Get matching items
  const items = actor ? actor.items.filter(i => i.name === itemName) : [];
  if ( items.length > 1 ) {
    ui.notifications.warn(`Your controlled Actor ${actor.name} has more than one Item with name ${itemName}. The first matched item will be chosen.`);
  } else if ( items.length === 0 ) {
    return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);
  }
  const item = items[0];

  // Trigger the item roll
  if ( item.data.type === "spell" ) return actor.useSpell(item);
  return item.roll();
}
