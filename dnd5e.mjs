/**
 * The DnD5e game system for Foundry Virtual Tabletop
 * A system for playing the fifth edition of the world's most popular role-playing game.
 * Author: Atropos
 * Software License: MIT
 * Content License: https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf
 * Repository: https://github.com/foundryvtt/dnd5e
 * Issue Tracker: https://github.com/foundryvtt/dnd5e/issues
 */

// Import Configuration
import DND5E from "./module/config.mjs";
import registerSystemSettings from "./module/settings.mjs";

// Import Submodules
import * as advancement from "./module/advancement/_module.mjs";
import * as applications from "./module/applications/_module.mjs";
import * as canvas from "./module/canvas/_module.mjs";
import * as dice from "./module/dice/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as migrations from "./module/migration.mjs";
import * as utils from "./module/utils.mjs";

/* -------------------------------------------- */
/*  Define Module Structure                     */
/* -------------------------------------------- */

globalThis.dnd5e = {
  advancement,
  applications,
  canvas,
  config: DND5E,
  dice,
  documents,
  migrations,
  utils
};

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
  globalThis.dnd5e = game.dnd5e = Object.assign(game.system, globalThis.dnd5e);
  console.log(`DnD5e | Initializing the DnD5e Game System - Version ${dnd5e.version}\n${DND5E.ASCII}`);

  /** @deprecated */
  Object.defineProperty(dnd5e, "entities", {
    get() {
      foundry.utils.logCompatibilityWarning(
        "You are referencing the 'dnd5e.entities' property which has been deprecated and renamed to "
        + "'dnd5e.documents'. Support for this old path will be removed in a future version.",
        { since: "DnD5e 2.0", until: "DnD5e 2.2" }
      );
      return dnd5e.documents;
    }
  });

  /** @deprecated */
  Object.defineProperty(dnd5e, "rollItemMacro", {
    get() {
      foundry.utils.logCompatibilityWarning(
        "You are referencing the 'dnd5e.rollItemMacro' method which has been deprecated and renamed to "
        + "'dnd5e.documents.macro.rollItem'. Support for this old path will be removed in a future version.",
        { since: "DnD5e 2.0", until: "DnD5e 2.2" }
      );
      return dnd5e.documents.macro.rollItem;
    }
  });

  /** @deprecated */
  Object.defineProperty(dnd5e, "macros", {
    get() {
      foundry.utils.logCompatibilityWarning(
        "You are referencing the 'dnd5e.macros' property which has been deprecated and renamed to "
        + "'dnd5e.documents.macro'. Support for this old path will be removed in a future version.",
        { since: "DnD5e 2.0", until: "DnD5e 2.2" }
      );
      return dnd5e.documents.macro;
    }
  });

  // Record Configuration Values
  CONFIG.DND5E = DND5E;
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
  if ( !game.settings.get("dnd5e", "honorScore") ) {
    delete DND5E.abilities.hon;
    delete DND5E.abilityAbbreviations.hon;
  }
  if ( !game.settings.get("dnd5e", "sanityScore") ) {
    delete DND5E.abilities.san;
    delete DND5E.abilityAbbreviations.san;
  }

  // Patch Core Functions
  CONFIG.Combat.initiative.formula = "1d20 + @attributes.init.mod + @attributes.init.prof + @attributes.init.bonus + @abilities.dex.bonuses.check + @bonuses.abilities.check";
  Combatant.prototype._getInitiativeFormula = documents.combat._getInitiativeFormula;

  // Register Roll Extensions
  CONFIG.Dice.rolls.push(dice.D20Roll);
  CONFIG.Dice.rolls.push(dice.DamageRoll);

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dnd5e", applications.actor.ActorSheet5eCharacter, {
    types: ["character"],
    makeDefault: true,
    label: "DND5E.SheetClassCharacter"
  });
  Actors.registerSheet("dnd5e", applications.actor.ActorSheet5eNPC, {
    types: ["npc"],
    makeDefault: true,
    label: "DND5E.SheetClassNPC"
  });
  Actors.registerSheet("dnd5e", applications.actor.ActorSheet5eVehicle, {
    types: ["vehicle"],
    makeDefault: true,
    label: "DND5E.SheetClassVehicle"
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dnd5e", applications.item.ItemSheet5e, {
    makeDefault: true,
    label: "DND5E.SheetClassItem"
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
  CONFIG.DND5E.trackableAttributes = expandAttributeList(CONFIG.DND5E.trackableAttributes);
  CONFIG.DND5E.consumableResources = expandAttributeList(CONFIG.DND5E.consumableResources);
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
Hooks.once("i18nInit", () => utils.performPreLocalization(CONFIG.DND5E));

/* -------------------------------------------- */
/*  Foundry VTT Ready                           */
/* -------------------------------------------- */

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once("ready", function() {
  // Apply custom compendium styles to the SRD rules compendium.
  const rules = game.packs.get("dnd5e.rules");
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
  const cv = game.settings.get("dnd5e", "systemMigrationVersion") || game.world.flags.dnd5e?.version;
  const totalDocuments = game.actors.size + game.scenes.size + game.items.size;
  if ( !cv && totalDocuments === 0 ) return game.settings.set("dnd5e", "systemMigrationVersion", game.system.version);
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
  gameCanvas.grid.diagonalRule = game.settings.get("dnd5e", "diagonalMovement");
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
  advancement,
  applications,
  canvas,
  dice,
  documents,
  migrations,
  utils,
  DND5E
};
