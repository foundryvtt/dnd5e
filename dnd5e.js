/**
 * The DnD5e game system for Foundry Virtual Tabletop
 * A system for playing the fifth edition of the worlds most popular roleplaying game.
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
import { measureDistances } from "./module/canvas.js";

// Import Documents
import Actor5e from "./module/actor/entity.js";
import Item5e from "./module/item/entity.js";
import { TokenDocument5e, Token5e } from "./module/token.js";

// Import Applications
import AbilityTemplate from "./module/pixi/ability-template.js";
import AbilityUseDialog from "./module/apps/ability-use-dialog.js";
import ActorSheetFlags from "./module/apps/actor-flags.js";
import ActorSheet5eCharacter from "./module/actor/sheets/character.js";
import ActorSheet5eNPC from "./module/actor/sheets/npc.js";
import ActorSheet5eVehicle from "./module/actor/sheets/vehicle.js";
import ItemSheet5e from "./module/item/sheet.js";
import ShortRestDialog from "./module/apps/short-rest.js";
import TraitSelector from "./module/apps/trait-selector.js";
import ActorMovementConfig from "./module/apps/movement-config.js";
import ActorSensesConfig from "./module/apps/senses-config.js";

// Import Helpers
import * as chat from "./module/chat.js";
import * as dice from "./module/dice.js";
import * as macros from "./module/macros.js";
import * as migrations from "./module/migration.js";
import ActiveEffect5e from "./module/active-effect.js";
import ActorAbilityConfig from "./module/apps/ability-config.js";
import ActorSkillConfig from "./module/apps/skill-config.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
  console.log(`DnD5e | Initializing the DnD5e Game System\n${DND5E.ASCII}`);

  // Create a namespace within the game global
  game.dnd5e = {
    applications: {
      AbilityUseDialog,
      ActorSheetFlags,
      ActorSheet5eCharacter,
      ActorSheet5eNPC,
      ActorSheet5eVehicle,
      ItemSheet5e,
      ShortRestDialog,
      TraitSelector,
      ActorMovementConfig,
      ActorSensesConfig,
      ActorAbilityConfig,
      ActorSkillConfig
    },
    canvas: {
      AbilityTemplate
    },
    config: DND5E,
    dice: dice,
    entities: {
      Actor5e,
      Item5e,
      TokenDocument5e,
      Token5e
    },
    macros: macros,
    migrations: migrations,
    rollItemMacro: macros.rollItemMacro,
    isV9: !foundry.utils.isNewerVersion("9.224", game.version ?? game.data.version)
  };

  // This will be removed when dnd5e minimum core version is updated to v9.
  if ( !game.dnd5e.isV9 ) dice.shimIsDeterministic();

  // Record Configuration Values
  CONFIG.DND5E = DND5E;
  CONFIG.ActiveEffect.documentClass = ActiveEffect5e;
  CONFIG.Actor.documentClass = Actor5e;
  CONFIG.Item.documentClass = Item5e;
  CONFIG.Token.documentClass = TokenDocument5e;
  CONFIG.Token.objectClass = Token5e;
  CONFIG.time.roundTime = 6;

  CONFIG.Dice.DamageRoll = dice.DamageRoll;
  CONFIG.Dice.D20Roll = dice.D20Roll;

  // 5e cone RAW should be 53.13 degrees
  CONFIG.MeasuredTemplate.defaults.angle = 53.13;

  // Register System Settings
  registerSystemSettings();

  // Patch Core Functions
  CONFIG.Combat.initiative.formula = "1d20 + @attributes.init.mod + @attributes.init.prof + @attributes.init.bonus + @abilities.dex.bonuses.check + @bonuses.abilities.check";
  Combatant.prototype._getInitiativeFormula = _getInitiativeFormula;

  // Register Roll Extensions
  CONFIG.Dice.rolls.push(dice.D20Roll);
  CONFIG.Dice.rolls.push(dice.DamageRoll);

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dnd5e", ActorSheet5eCharacter, {
    types: ["character"],
    makeDefault: true,
    label: "DND5E.SheetClassCharacter"
  });
  Actors.registerSheet("dnd5e", ActorSheet5eNPC, {
    types: ["npc"],
    makeDefault: true,
    label: "DND5E.SheetClassNPC"
  });
  Actors.registerSheet("dnd5e", ActorSheet5eVehicle, {
    types: ["vehicle"],
    makeDefault: true,
    label: "DND5E.SheetClassVehicle"
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dnd5e", ItemSheet5e, {
    makeDefault: true,
    label: "DND5E.SheetClassItem"
  });

  // Preload Handlebars Templates
  return preloadHandlebarsTemplates();
});


/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

/**
 * Perform one-time pre-localization and sorting of some configuration objects
 */
Hooks.once("setup", function() {
  const localizeKeys = [
    "abilities", "abilityAbbreviations", "abilityActivationTypes", "abilityConsumptionTypes", "actorSizes",
    "alignments", "armorClasses.label", "armorProficiencies", "armorTypes", "conditionTypes", "consumableTypes",
    "cover", "currencies.label", "currencies.abbreviation", "damageResistanceTypes", "damageTypes", "distanceUnits",
    "equipmentTypes", "healingTypes", "itemActionTypes", "itemRarity", "languages", "limitedUsePeriods",
    "miscEquipmentTypes", "movementTypes", "movementUnits", "polymorphSettings", "proficiencyLevels", "senses",
    "skills", "spellComponents", "spellLevels", "spellPreparationModes", "spellScalingModes", "spellSchools",
    "targetTypes", "timePeriods", "toolProficiencies", "toolTypes", "vehicleTypes", "weaponProficiencies",
    "weaponProperties", "weaponTypes"
  ];
  const sortKeys = [
    "abilityAbbreviations", "abilityActivationTypes", "abilityConsumptionTypes", "actorSizes", "conditionTypes",
    "consumableTypes", "cover", "damageResistanceTypes", "damageTypes", "equipmentTypes", "healingTypes",
    "languages", "miscEquipmentTypes", "movementTypes", "polymorphSettings", "senses", "skills", "spellScalingModes",
    "spellSchools", "targetTypes", "toolProficiencies", "toolTypes", "vehicleTypes", "weaponProperties"
  ];
  preLocalizeConfig(CONFIG.DND5E, localizeKeys, sortKeys);
  CONFIG.DND5E.trackableAttributes = expandAttributeList(CONFIG.DND5E.trackableAttributes);
  CONFIG.DND5E.consumableResources = expandAttributeList(CONFIG.DND5E.consumableResources);
});

/* -------------------------------------------- */

/**
 * Localize and sort configuration values
 * @param {object} config           The configuration object being prepared
 * @param {string[]} localizeKeys   An array of keys to localize
 * @param {string[]} sortKeys       An array of keys to sort
 */
function preLocalizeConfig(config, localizeKeys, sortKeys) {

  // Localize Objects
  for ( const key of localizeKeys ) {
    if ( key.includes(".") ) {
      const [inner, label] = key.split(".");
      _localizeObject(config[inner], label);
    }
    else _localizeObject(config[key]);
  }

  // Sort objects
  for ( const key of sortKeys ) {
    if ( key.includes(".") ) {
      const [configKey, sortKey] = key.split(".");
      config[configKey] = _sortObject(config[configKey], sortKey);
    }
    else config[key] = _sortObject(config[key]);
  }
}

/* -------------------------------------------- */

/**
 * Localize the values of a configuration object by translating them in-place.
 * @param {object} obj                The configuration object to localize
 * @param {string} [key]              An inner key which should be localized
 * @private
 */
function _localizeObject(obj, key) {
  for ( const [k, v] of Object.entries(obj) ) {

    // String directly
    if ( typeof v === "string" ) {
      obj[k] = game.i18n.localize(v);
      continue;
    }

    // Inner object
    if ( (typeof v !== "object") || !(key in v) ) {
      console.error(new Error("Configuration values must be a string or inner object for pre-localization"));
      continue;
    }
    v[key] = game.i18n.localize(v[key]);
  }
}

/* -------------------------------------------- */

/**
 * Sort a configuration object by its values or by an inner sortKey.
 * @param {object} obj                The configuration object to sort
 * @param {string} [sortKey]          An inner key upon which to sort
 * @returns {{[p: string]: any}}      The sorted configuration object
 */
function _sortObject(obj, sortKey) {
  let sorted = Object.entries(obj);
  if ( sortKey ) sorted = sorted.sort((a, b) => a[1][sortKey].localeCompare(b[1][sortKey]));
  else sorted = sorted.sort((a, b) => a[1].localeCompare(b[1]));
  return Object.fromEntries(sorted);
}

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

/* -------------------------------------------- */
/*  Foundry VTT Ready                           */
/* -------------------------------------------- */

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once("ready", function() {

  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => macros.create5eMacro(data, slot));

  // Determine whether a system migration is required and feasible
  if ( !game.user.isGM ) return;
  const currentVersion = game.settings.get("dnd5e", "systemMigrationVersion");
  const NEEDS_MIGRATION_VERSION = "1.5.6";
  const COMPATIBLE_MIGRATION_VERSION = 0.80;
  const totalDocuments = game.actors.size + game.scenes.size + game.items.size;
  if ( !currentVersion && totalDocuments === 0 ) return game.settings.set("dnd5e", "systemMigrationVersion", game.system.data.version);
  const needsMigration = !currentVersion || isNewerVersion(NEEDS_MIGRATION_VERSION, currentVersion);
  if ( !needsMigration ) return;

  // Perform the migration
  if ( currentVersion && isNewerVersion(COMPATIBLE_MIGRATION_VERSION, currentVersion) ) {
    const warning = "Your DnD5e system data is from too old a Foundry version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.";
    ui.notifications.error(warning, {permanent: true});
  }
  migrations.migrateWorld();
});

/* -------------------------------------------- */
/*  Canvas Initialization                       */
/* -------------------------------------------- */

Hooks.on("canvasInit", function() {
  // Extend Diagonal Measurement
  canvas.grid.diagonalRule = game.settings.get("dnd5e", "diagonalMovement");
  SquareGrid.prototype.measureDistances = measureDistances;
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
Hooks.on("renderChatPopout", (app, html, data) => Item5e.chatListeners(html));
Hooks.on("getActorDirectoryEntryContext", Actor5e.addDirectoryContextOptions);

// FIXME: This helper is needed for the vehicle sheet. It should probably be refactored.
Handlebars.registerHelper("getProperty", function(data, property) {
  return getProperty(data, property);
});
