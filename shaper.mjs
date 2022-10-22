/**
 * The shaperSystem game system for Foundry Virtual Tabletop
 * A system for playing the fifth edition of the world's most popular role-playing game.
 * Author: Atropos
 * Software License: MIT
 * Content License: https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf
 * Repository: https://github.com/foundryvtt/shaper
 * Issue Tracker: https://github.com/foundryvtt/shaper/issues
 */

// Import Configuration
import SHAPER from "./module/config.mjs";
import registerSystemSettings from "./module/settings.mjs";

// Import Submodules
import * as applications from "./module/applications/_module.mjs";
import * as canvas from "./module/canvas/_module.mjs";
import * as dice from "./module/dice/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as migrations from "./module/migration.mjs";
import * as utils from "./module/utils.mjs";

/* -------------------------------------------- */
/*  Define Module Structure                     */
/* -------------------------------------------- */

globalThis.shaper = {
  applications,
  canvas,
  config: SHAPER,
  dice,
  documents,
  migrations,
  utils
};

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
  globalThis.shaper = game.shaper = Object.assign(game.system, globalThis.shaper);
  console.log(`shaperSystem | Initializing the shaperSystem Game System - Version ${shaper.version}\n${SHAPER.ASCII}`);

  /** @deprecated */
  Object.defineProperty(shaper, "entities", {
    get() {
      foundry.utils.logCompatibilityWarning(
        "You are referencing the 'shaper.entities' property which has been deprecated and renamed to "
        + "'shaper.documents'. Support for this old path will be removed in a future version.",
        { since: "shaperSystem 2.0", until: "shaperSystem 2.2" }
      );
      return shaper.documents;
    }
  });

  /** @deprecated */
  Object.defineProperty(shaper, "rollItemMacro", {
    get() {
      foundry.utils.logCompatibilityWarning(
        "You are referencing the 'shaper.rollItemMacro' method which has been deprecated and renamed to "
        + "'shaper.documents.macro.rollItem'. Support for this old path will be removed in a future version.",
        { since: "shaperSystem 2.0", until: "shaperSystem 2.2" }
      );
      return shaper.documents.macro.rollItem;
    }
  });

  /** @deprecated */
  Object.defineProperty(shaper, "macros", {
    get() {
      foundry.utils.logCompatibilityWarning(
        "You are referencing the 'shaper.macros' property which has been deprecated and renamed to "
        + "'shaper.documents.macro'. Support for this old path will be removed in a future version.",
        { since: "shaperSystem 2.0", until: "shaperSystem 2.2" }
      );
      return shaper.documents.macro;
    }
  });

  // Record Configuration Values
  CONFIG.SHAPER = SHAPER;
  CONFIG.ActiveEffect.documentClass = documents.ActiveEffect5e;
  CONFIG.Actor.documentClass = documents.Actor5e;
  CONFIG.Item.documentClass = documents.Item5e;
  CONFIG.Token.documentClass = documents.TokenDocument5e;
  CONFIG.Token.objectClass = canvas.Token5e;
  CONFIG.time.roundTime = 6;
  CONFIG.Dice.DamageRoll = dice.DamageRoll;
  CONFIG.Dice.D20Roll = dice.D20Roll;
  CONFIG.MeasuredTemplate.defaults.angle = 53.13; // 5e cone RAW should be 53.13 degrees

  // Register System Settings
  registerSystemSettings();

  // Remove honor & sanity from configuration if they aren't enabled
  if ( !game.settings.get("shaper", "honorScore") ) {
    delete SHAPER.abilities.hon;
    delete SHAPER.abilityAbbreviations.hon;
  }
  if ( !game.settings.get("shaper", "sanityScore") ) {
    delete SHAPER.abilities.san;
    delete SHAPER.abilityAbbreviations.san;
  }

  // Patch Core Functions
  CONFIG.Combat.initiative.formula = "1d20 + @attributes.init.mod + @attributes.init.prof + @attributes.init.bonus + @abilities.dex.bonuses.check + @bonuses.abilities.check";
  Combatant.prototype._getInitiativeFormula = documents.combat._getInitiativeFormula;

  // Register Roll Extensions
  CONFIG.Dice.rolls.push(dice.D20Roll);
  CONFIG.Dice.rolls.push(dice.DamageRoll);

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("shaper", applications.actor.ActorSheet5eCharacter, {
    types: ["character"],
    makeDefault: true,
    label: "SHAPER.SheetClassCharacter"
  });
  Actors.registerSheet("shaper", applications.actor.ActorSheet5eNPC, {
    types: ["npc"],
    makeDefault: true,
    label: "SHAPER.SheetClassNPC"
  });
  Actors.registerSheet("shaper", applications.actor.ActorSheet5eVehicle, {
    types: ["vehicle"],
    makeDefault: true,
    label: "SHAPER.SheetClassVehicle"
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("shaper", applications.item.ItemSheet5e, {
    makeDefault: true,
    label: "SHAPER.SheetClassItem"
  });

  // Preload Handlebars helpers & partials
  utils.registerHandlebarsHelpers();
  utils.preloadHandlebarsTemplates();
});


/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

/**
 * Prepare attribute lists.
 */
Hooks.once("setup", function() {
  CONFIG.SHAPER.trackableAttributes = expandAttributeList(CONFIG.SHAPER.trackableAttributes);
  CONFIG.SHAPER.consumableResources = expandAttributeList(CONFIG.SHAPER.consumableResources);
});

/* --------------------------------------------- */

/**
 * Expand a list of attribute paths into an object that can be traversed.
 * @param {string[]} attributes  The initial attributes configuration.
 * @returns {object}  The expanded object structure.
 */
function expandAttributeList(attributes) {
  return attributes.reduce((obj, attr) => {
    foundry.utils.setProperty(obj, attr, true);
    return obj;
  }, {});
}

/* --------------------------------------------- */

/**
 * Perform one-time pre-localization and sorting of some configuration objects
 */
Hooks.once("i18nInit", () => utils.performPreLocalization(CONFIG.SHAPER));

/* -------------------------------------------- */
/*  Foundry VTT Ready                           */
/* -------------------------------------------- */

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once("ready", function() {
  // Apply custom compendium styles to the SRD rules compendium.
  const rules = game.packs.get("shaper.rules");
  rules.apps = [new applications.SRDCompendium(rules)];

  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if ( ["Item", "ActiveEffect"].includes(data.type) ) {
      documents.macro.create5eMacro(data, slot);
      return false;
    }
  });

  // Determine whether a system migration is required and feasible
  if ( !game.user.isGM ) return;
  const cv = game.settings.get("shaper", "systemMigrationVersion") || game.world.flags.shaper?.version;
  const totalDocuments = game.actors.size + game.scenes.size + game.items.size;
  if ( !cv && totalDocuments === 0 ) return game.settings.set("shaper", "systemMigrationVersion", game.system.version);
  if ( cv && !isNewerVersion(game.system.flags.needsMigrationVersion, cv) ) return;

  // Perform the migration
  if ( cv && isNewerVersion(game.system.flags.compatibleMigrationVersion, cv) ) {
    ui.notifications.error(game.i18n.localize("MIGRATION.5eVersionTooOldWarning"), {permanent: true});
  }
  migrations.migrateWorld();
});

/* -------------------------------------------- */
/*  Canvas Initialization                       */
/* -------------------------------------------- */

Hooks.on("canvasInit", gameCanvas => {
  gameCanvas.grid.diagonalRule = game.settings.get("shaper", "diagonalMovement");
  SquareGrid.prototype.measureDistances = canvas.measureDistances;
});

/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

Hooks.on("renderChatMessage", documents.chat.onRenderChatMessage);
Hooks.on("getChatLogEntryContext", documents.chat.addChatMessageContextOptions);

Hooks.on("renderChatLog", (app, html, data) => documents.Item5e.chatListeners(html));
Hooks.on("renderChatPopout", (app, html, data) => documents.Item5e.chatListeners(html));
Hooks.on("getActorDirectoryEntryContext", documents.Actor5e.addDirectoryContextOptions);

/* -------------------------------------------- */
/*  Bundled Module Exports                      */
/* -------------------------------------------- */

export {
  applications,
  canvas,
  dice,
  documents,
  migrations,
  utils,
  SHAPER
};
