/**
 * The D&D fifth edition game system for Foundry Virtual Tabletop
 * A system for playing the fifth edition of the world's most popular role-playing game.
 * Author: Atropos
 * Software License: MIT
 * Content License: https://www.dndbeyond.com/attachments/39j2li89/SRD5.1-CCBY4.0License.pdf
 * Repository: https://github.com/foundryvtt/dnd5e
 * Issue Tracker: https://github.com/foundryvtt/dnd5e/issues
 */

// Import Configuration
import DND5E from "./module/config.mjs";
import { registerSystemKeybindings, registerSystemSettings, registerDeferredSettings } from "./module/settings.mjs";

// Import Submodules
import * as applications from "./module/applications/_module.mjs";
import * as canvas from "./module/canvas/_module.mjs";
import * as dataModels from "./module/data/_module.mjs";
import * as dice from "./module/dice/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import DragDrop5e from "./module/drag-drop.mjs";
import * as enrichers from "./module/enrichers.mjs";
import * as Filter from "./module/filter.mjs";
import * as migrations from "./module/migration.mjs";
import ModuleArt from "./module/module-art.mjs";
import {registerModuleData, setupModulePacks} from "./module/module-registration.mjs";
import parseUuid from "./module/parse-uuid.mjs";
import {default as registry} from "./module/registry.mjs";
import Tooltips5e from "./module/tooltips.mjs";
import * as utils from "./module/utils.mjs";

/* -------------------------------------------- */
/*  Define Module Structure                     */
/* -------------------------------------------- */

globalThis.dnd5e = {
  applications,
  canvas,
  config: DND5E,
  dataModels,
  dice,
  documents,
  enrichers,
  Filter,
  migrations,
  registry,
  utils
};

DragDrop = DragDrop5e;

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
  globalThis.dnd5e = game.dnd5e = Object.assign(game.system, globalThis.dnd5e);
  utils.log(`Initializing the D&D Fifth Game System - Version ${dnd5e.version}\n${DND5E.ASCII}`);

  if ( game.release.generation < 13 ) patchFromUuid();
  CONFIG.compatibility.excludePatterns.push(
    /now namespaced under/, /V1 Application framework/, /Set#isSubset/, /ChatMessage#getHTML/, /renderChatMessage/
  );

  // Record Configuration Values
  CONFIG.DND5E = DND5E;
  CONFIG.ActiveEffect.documentClass = documents.ActiveEffect5e;
  CONFIG.ActiveEffect.legacyTransferral = false;
  CONFIG.Actor.documentClass = documents.Actor5e;
  CONFIG.ChatMessage.documentClass = documents.ChatMessage5e;
  CONFIG.Combat.documentClass = documents.Combat5e;
  CONFIG.Combatant.documentClass = documents.Combatant5e;
  CONFIG.Item.collection = dataModels.collection.Items5e;
  CONFIG.Item.compendiumIndexFields.push("system.container");
  CONFIG.Item.documentClass = documents.Item5e;
  CONFIG.JournalEntryPage.documentClass = documents.JournalEntryPage5e;
  CONFIG.Token.documentClass = documents.TokenDocument5e;
  CONFIG.Token.objectClass = canvas.Token5e;
  CONFIG.User.documentClass = documents.User5e;
  CONFIG.time.roundTime = 6;
  Roll.TOOLTIP_TEMPLATE = "systems/dnd5e/templates/chat/roll-breakdown.hbs";
  CONFIG.Dice.BasicRoll = dice.BasicRoll;
  CONFIG.Dice.DamageRoll = dice.DamageRoll;
  CONFIG.Dice.D20Die = dice.D20Die;
  CONFIG.Dice.D20Roll = dice.D20Roll;
  CONFIG.MeasuredTemplate.defaults.angle = 53.13; // 5e cone RAW should be 53.13 degrees
  CONFIG.Note.objectClass = canvas.Note5e;
  CONFIG.ui.chat = applications.ChatLog5e;
  CONFIG.ui.combat = applications.combat.CombatTracker5e;
  CONFIG.ui.items = applications.item.ItemDirectory5e;

  // Register System Settings
  registerSystemSettings();
  registerSystemKeybindings();

  // Configure module art & register module data
  game.dnd5e.moduleArt = new ModuleArt();
  registerModuleData();

  // Configure bastions
  game.dnd5e.bastion = new documents.Bastion();

  // Configure tooltips
  game.dnd5e.tooltips = new Tooltips5e();

  // Set up status effects
  _configureStatusEffects();

  // Remove honor & sanity from configuration if they aren't enabled
  if ( !game.settings.get("dnd5e", "honorScore") ) delete DND5E.abilities.hon;
  if ( !game.settings.get("dnd5e", "sanityScore") ) delete DND5E.abilities.san;

  // Legacy rules.
  if ( game.settings.get("dnd5e", "rulesVersion") === "legacy" ) {

    // Set half-casters to round down.
    delete DND5E.spellcastingTypes.leveled.progression.half.roundUp;

    // Adjust Wild Shape and Polymorph presets.
    delete DND5E.transformationPresets.wildshape.options.keepHP;
    delete DND5E.transformationPresets.wildshape.options.keepType;
    delete DND5E.transformationPresets.polymorph.options.addTemp;
    delete DND5E.transformationPresets.polymorph.options.keepHP;
    delete DND5E.transformationPresets.polymorph.options.keepType;

    // Adjust language categories.
    delete DND5E.languages.standard.children.sign;
    DND5E.languages.exotic.children.draconic = DND5E.languages.standard.children.draconic;
    delete DND5E.languages.standard.children.draconic;
    DND5E.languages.cant = DND5E.languages.exotic.children.cant;
    delete DND5E.languages.exotic.children.cant;
    DND5E.languages.druidic = DND5E.languages.exotic.children.druidic;
    delete DND5E.languages.exotic.children.druidic;

    // Stunned stops movement in legacy.
    DND5E.conditionEffects.noMovement.add("stunned");
  }

  // Register Roll Extensions
  CONFIG.Dice.rolls = [dice.BasicRoll, dice.D20Roll, dice.DamageRoll];

  // Hook up system data types
  CONFIG.ActiveEffect.dataModels = dataModels.activeEffect.config;
  CONFIG.Actor.dataModels = dataModels.actor.config;
  CONFIG.ChatMessage.dataModels = dataModels.chatMessage.config;
  CONFIG.Item.dataModels = dataModels.item.config;
  CONFIG.JournalEntryPage.dataModels = dataModels.journal.config;

  // Add fonts
  _configureFonts();

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dnd5e", applications.actor.ActorSheet5eCharacter, {
    types: ["character"],
    label: "DND5E.SheetClassCharacterLegacy"
  });
  DocumentSheetConfig.registerSheet(Actor, "dnd5e", applications.actor.ActorSheet5eCharacter2, {
    types: ["character"],
    makeDefault: true,
    label: "DND5E.SheetClassCharacter"
  });
  Actors.registerSheet("dnd5e", applications.actor.ActorSheet5eNPC, {
    types: ["npc"],
    label: "DND5E.SheetClassNPCLegacy"
  });
  DocumentSheetConfig.registerSheet(Actor, "dnd5e", applications.actor.ActorSheet5eNPC2, {
    types: ["npc"],
    makeDefault: true,
    label: "DND5E.SheetClassNPC"
  });
  Actors.registerSheet("dnd5e", applications.actor.ActorSheet5eVehicle, {
    types: ["vehicle"],
    makeDefault: true,
    label: "DND5E.SheetClassVehicle"
  });
  Actors.registerSheet("dnd5e", applications.actor.GroupActorSheet, {
    types: ["group"],
    makeDefault: true,
    label: "DND5E.SheetClassGroup"
  });

  DocumentSheetConfig.unregisterSheet(Item, "core", ItemSheet);
  DocumentSheetConfig.registerSheet(Item, "dnd5e", applications.item.ItemSheet5e2, {
    makeDefault: true,
    label: "DND5E.SheetClassItem"
  });
  DocumentSheetConfig.unregisterSheet(Item, "dnd5e", applications.item.ItemSheet5e, { types: ["container"] });
  DocumentSheetConfig.unregisterSheet(Item, "dnd5e", applications.item.ItemSheet5e2, { types: ["container"] });
  DocumentSheetConfig.registerSheet(Item, "dnd5e", applications.item.ContainerSheet2, {
    makeDefault: true,
    types: ["container"],
    label: "DND5E.SheetClassContainer"
  });

  DocumentSheetConfig.registerSheet(JournalEntry, "dnd5e", applications.journal.JournalSheet5e, {
    makeDefault: true,
    label: "DND5E.SheetClassJournalEntry"
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, "dnd5e", applications.journal.JournalClassPageSheet, {
    label: "DND5E.SheetClassClassSummary",
    types: ["class", "subclass"]
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, "dnd5e", applications.journal.JournalMapLocationPageSheet, {
    label: "DND5E.SheetClassMapLocation",
    types: ["map"]
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, "dnd5e", applications.journal.JournalRulePageSheet, {
    label: "DND5E.SheetClassRule",
    types: ["rule"]
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, "dnd5e", applications.journal.JournalSpellListPageSheet, {
    label: "DND5E.SheetClassSpellList",
    types: ["spells"]
  });

  CONFIG.Token.prototypeSheetClass = game.release.generation < 13
    ? applications.TokenConfig5e
    : applications.PrototypeTokenConfig5e;
  DocumentSheetConfig.unregisterSheet(TokenDocument, "core", TokenConfig);
  DocumentSheetConfig.registerSheet(TokenDocument, "dnd5e", applications.TokenConfig5e, {
    label: "DND5E.SheetClassToken"
  });

  // Preload Handlebars helpers & partials
  utils.registerHandlebarsHelpers();
  utils.preloadHandlebarsTemplates();

  // Enrichers
  enrichers.registerCustomEnrichers();

  // Exhaustion handling
  documents.ActiveEffect5e.registerHUDListeners();
});

/* -------------------------------------------- */

/**
 * Configure explicit lists of attributes that are trackable on the token HUD and in the combat tracker.
 * @internal
 */
function _configureTrackableAttributes() {
  const common = {
    bar: [],
    value: [
      ...Object.keys(DND5E.abilities).map(ability => `abilities.${ability}.value`),
      ...Object.keys(DND5E.movementTypes).map(movement => `attributes.movement.${movement}`),
      "attributes.ac.value", "attributes.init.total"
    ]
  };

  const altSpells = Object.entries(DND5E.spellPreparationModes).reduce((acc, [k, v]) => {
    if ( !["prepared", "always"].includes(k) && v.upcast ) acc.push(`spells.${k}`);
    return acc;
  }, []);

  const creature = {
    bar: [
      ...common.bar,
      "attributes.hp",
      ...altSpells,
      ...Array.fromRange(Object.keys(DND5E.spellLevels).length - 1, 1).map(l => `spells.spell${l}`)
    ],
    value: [
      ...common.value,
      ...Object.keys(DND5E.skills).map(skill => `skills.${skill}.passive`),
      ...Object.keys(DND5E.senses).map(sense => `attributes.senses.${sense}`),
      "attributes.spell.attack", "attributes.spell.dc"
    ]
  };

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: [...creature.bar, "resources.primary", "resources.secondary", "resources.tertiary", "details.xp"],
      value: [...creature.value]
    },
    npc: {
      bar: [...creature.bar, "resources.legact", "resources.legres"],
      value: [...creature.value, "attributes.spell.level", "details.cr", "details.xp.value"]
    },
    vehicle: {
      bar: [...common.bar, "attributes.hp"],
      value: [...common.value]
    },
    group: {
      bar: [],
      value: []
    }
  };
}

/* -------------------------------------------- */

/**
 * Configure which attributes are available for item consumption.
 * @internal
 */
function _configureConsumableAttributes() {
  const altSpells = Object.entries(DND5E.spellPreparationModes).reduce((acc, [k, v]) => {
    if ( !["prepared", "always"].includes(k) && v.upcast ) acc.push(`spells.${k}.value`);
    return acc;
  }, []);

  CONFIG.DND5E.consumableResources = [
    ...Object.keys(DND5E.abilities).map(ability => `abilities.${ability}.value`),
    "attributes.ac.flat",
    "attributes.hp.value",
    "attributes.exhaustion",
    ...Object.keys(DND5E.senses).map(sense => `attributes.senses.${sense}`),
    ...Object.keys(DND5E.movementTypes).map(type => `attributes.movement.${type}`),
    ...Object.keys(DND5E.currencies).map(denom => `currency.${denom}`),
    "details.xp.value",
    "resources.primary.value", "resources.secondary.value", "resources.tertiary.value",
    "resources.legact.value", "resources.legres.value",
    ...altSpells,
    ...Array.fromRange(Object.keys(DND5E.spellLevels).length - 1, 1).map(level => `spells.spell${level}.value`)
  ];
}

/* -------------------------------------------- */

/**
 * Configure additional system fonts.
 */
function _configureFonts() {
  Object.assign(CONFIG.fontDefinitions, {
    Roboto: {
      editor: true,
      fonts: [
        { urls: ["systems/dnd5e/fonts/roboto/Roboto-Regular.woff2"] },
        { urls: ["systems/dnd5e/fonts/roboto/Roboto-Bold.woff2"], weight: "bold" },
        { urls: ["systems/dnd5e/fonts/roboto/Roboto-Italic.woff2"], style: "italic" },
        { urls: ["systems/dnd5e/fonts/roboto/Roboto-BoldItalic.woff2"], weight: "bold", style: "italic" }
      ]
    },
    "Roboto Condensed": {
      editor: true,
      fonts: [
        { urls: ["systems/dnd5e/fonts/roboto-condensed/RobotoCondensed-Regular.woff2"] },
        { urls: ["systems/dnd5e/fonts/roboto-condensed/RobotoCondensed-Bold.woff2"], weight: "bold" },
        { urls: ["systems/dnd5e/fonts/roboto-condensed/RobotoCondensed-Italic.woff2"], style: "italic" },
        {
          urls: ["systems/dnd5e/fonts/roboto-condensed/RobotoCondensed-BoldItalic.woff2"], weight: "bold",
          style: "italic"
        }
      ]
    },
    "Roboto Slab": {
      editor: true,
      fonts: [
        { urls: ["systems/dnd5e/fonts/roboto-slab/RobotoSlab-Regular.ttf"] },
        { urls: ["systems/dnd5e/fonts/roboto-slab/RobotoSlab-Bold.ttf"], weight: "bold" }
      ]
    }
  });
}

/* -------------------------------------------- */

/**
 * Configure system status effects.
 */
function _configureStatusEffects() {
  const addEffect = (effects, {special, ...data}) => {
    data = foundry.utils.deepClone(data);
    data._id = utils.staticID(`dnd5e${data.id}`);
    data.img = data.icon ?? data.img;
    delete data.icon;
    effects.push(data);
    if ( special ) CONFIG.specialStatusEffects[special] = data.id;
  };
  CONFIG.statusEffects = Object.entries(CONFIG.DND5E.statusEffects).reduce((arr, [id, data]) => {
    const original = CONFIG.statusEffects.find(s => s.id === id);
    addEffect(arr, foundry.utils.mergeObject(original ?? {}, { id, ...data }, { inplace: false }));
    return arr;
  }, []);
  for ( const [id, {label: name, ...data}] of Object.entries(CONFIG.DND5E.conditionTypes) ) {
    addEffect(CONFIG.statusEffects, { id, name, ...data });
  }
  for ( const [id, data] of Object.entries(CONFIG.DND5E.encumbrance.effects) ) {
    addEffect(CONFIG.statusEffects, { id, ...data, hud: false });
  }
}

/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

/**
 * Prepare attribute lists.
 */
Hooks.once("setup", function() {
  // Configure trackable & consumable attributes.
  _configureTrackableAttributes();
  _configureConsumableAttributes();

  CONFIG.DND5E.trackableAttributes = expandAttributeList(CONFIG.DND5E.trackableAttributes);
  game.dnd5e.moduleArt.registerModuleArt();
  Tooltips5e.activateListeners();
  game.dnd5e.tooltips.observe();

  // Register settings after modules have had a chance to initialize
  registerDeferredSettings();

  // Set up compendiums with custom applications & sorting
  setupModulePacks();

  // Create CSS for currencies
  const style = document.createElement("style");
  const currencies = append => Object.entries(CONFIG.DND5E.currencies)
    .map(([key, { icon }]) => `&.${key}${append ?? ""} { background-image: url("${icon}"); }`);
  style.innerHTML = `
    :is(.dnd5e2, .dnd5e2-journal) :is(i, span).currency {
      ${currencies().join("\n")}
    }
    .dnd5e2 .form-group label.label-icon.currency {
      ${currencies("::after").join("\n")}
    }
  `;
  document.head.append(style);
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
Hooks.once("i18nInit", () => {
  if ( game.settings.get("dnd5e", "rulesVersion") === "legacy" ) {
    const { translations, _fallback } = game.i18n;
    foundry.utils.mergeObject(translations, {
      "TYPES.Item": {
        race: game.i18n.localize("TYPES.Item.raceLegacy"),
        racePl: game.i18n.localize("TYPES.Item.raceLegacyPl")
      },
      DND5E: {
        "Feature.Species": game.i18n.localize("DND5E.Feature.SpeciesLegacy"),
        FlagsAlertHint: game.i18n.localize("DND5E.FlagsAlertHintLegacy"),
        ItemSpeciesDetails: game.i18n.localize("DND5E.ItemSpeciesDetailsLegacy"),
        "Language.Category.Rare": game.i18n.localize("DND5E.Language.Category.Exotic"),
        RacialTraits: game.i18n.localize("DND5E.RacialTraitsLegacy"),
        "REST.Long.Hint.Normal": game.i18n.localize("DND5E.REST.Long.Hint.NormalLegacy"),
        "REST.Long.Hint.Group": game.i18n.localize("DND5E.REST.Long.Hint.GroupLegacy"),
        "Species.Add": game.i18n.localize("DND5E.Species.AddLegacy"),
        "Species.Features": game.i18n.localize("DND5E.Species.FeaturesLegacy"),
        "TARGET.Type.Emanation": foundry.utils.mergeObject(
          _fallback.DND5E?.TARGET?.Type?.Radius ?? {},
          translations.DND5E?.TARGET?.Type?.Radius ?? {},
          { inplace: false }
        ),
        TraitArmorPlural: foundry.utils.mergeObject(
          _fallback.DND5E?.TraitArmorLegacyPlural ?? {},
          translations.DND5E?.TraitArmorLegacyPlural ?? {},
          { inplace: false }
        ),
        TraitArmorProf: game.i18n.localize("DND5E.TraitArmorLegacyProf")
      }
    });
  }
  utils.performPreLocalization(CONFIG.DND5E);
  Object.values(CONFIG.DND5E.activityTypes).forEach(c => c.documentClass.localize());
  Object.values(CONFIG.DND5E.advancementTypes).forEach(c => c.documentClass.localize());
});

/* -------------------------------------------- */
/*  Foundry VTT Ready                           */
/* -------------------------------------------- */

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once("ready", function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if ( ["ActiveEffect", "Activity", "Item"].includes(data.type) ) {
      documents.macro.create5eMacro(data, slot);
      return false;
    }
  });

  // Adjust sourced items on actors now that compendium UUID redirects have been initialized
  game.actors.forEach(a => a.sourcedItems._redirectKeys());

  // Register items by type
  dnd5e.registry.classes.initialize();

  // Chat message listeners
  documents.ChatMessage5e.activateListeners();

  // Bastion initialization
  game.dnd5e.bastion.initializeUI();

  // Determine whether a system migration is required and feasible
  if ( !game.user.isGM ) return;
  const cv = game.settings.get("dnd5e", "systemMigrationVersion") || game.world.flags.dnd5e?.version;
  const totalDocuments = game.actors.size + game.scenes.size + game.items.size;
  if ( !cv && totalDocuments === 0 ) return game.settings.set("dnd5e", "systemMigrationVersion", game.system.version);
  if ( cv && !foundry.utils.isNewerVersion(game.system.flags.needsMigrationVersion, cv) ) return;

  // Compendium pack folder migration.
  if ( foundry.utils.isNewerVersion("3.0.0", cv) ) {
    migrations.reparentCompendiums("DnD5e SRD Content", "D&D SRD Content");
  }

  // Perform the migration
  if ( cv && foundry.utils.isNewerVersion(game.system.flags.compatibleMigrationVersion, cv) ) {
    ui.notifications.error("MIGRATION.5eVersionTooOldWarning", {localize: true, permanent: true});
  }
  migrations.migrateWorld();
});

/* -------------------------------------------- */
/*  System Styling                              */
/* -------------------------------------------- */

Hooks.on("renderPause", (app, [html]) => {
  html.classList.add("dnd5e2");
  const img = html.querySelector("img");
  img.src = "systems/dnd5e/ui/official/ampersand.svg";
  img.className = "";
});

Hooks.on("renderSettings", (app, html) => {
  html = html instanceof HTMLElement ? html : html[0];
  if ( game.release.generation > 12 ) applications.settings.sidebar.renderSettings(html);
  else applications.settings.sidebar.renderSettingsLegacy(html);
});

/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

Hooks.on("renderChatPopout", documents.ChatMessage5e.onRenderChatPopout);
Hooks.on("getChatLogEntryContext", documents.ChatMessage5e.addChatMessageContextOptions);

Hooks.on("renderChatLog", (app, html, data) => {
  documents.Item5e.chatListeners(html);
  documents.ChatMessage5e.onRenderChatLog(html);
});
Hooks.on("renderChatPopout", (app, html, data) => documents.Item5e.chatListeners(html));

Hooks.on("chatMessage", (app, message, data) => applications.Award.chatMessage(message));

Hooks.on("renderActorDirectory", (app, html, data) => documents.Actor5e.onRenderActorDirectory(html));

// V13 context menu additions
Hooks.on("getEntryContextDocumentDirectory", (app, entryOptions) => {
  if ( app instanceof Compendium ) return;
  if ( app.documentName === "Actor" ) {
    documents.Actor5e.addDirectoryContextOptions(app, entryOptions);
  } else if ( app.documentName === "Item" ) {
    documents.Item5e.addDirectoryContextOptions(app, entryOptions);
  }
});

// V12 context menu additions
Hooks.on("getActorDirectoryEntryContext", documents.Actor5e.addDirectoryContextOptions);
Hooks.on("getCompendiumEntryContext", documents.Item5e.addCompendiumContextOptions);
Hooks.on("getItemDirectoryEntryContext", documents.Item5e.addDirectoryContextOptions);

Hooks.on("renderCompendiumDirectory", (app, html) => {
  html = html instanceof HTMLElement ? html : html[0];
  applications.CompendiumBrowser.injectSidebarButton(html);
});

Hooks.on("renderJournalPageSheet", applications.journal.JournalSheet5e.onRenderJournalPageSheet);
Hooks.on(
  "renderJournalEntryPageProseMirrorSheet",
  applications.journal.JournalSheet5e.onRenderJournalEntryPageProseMirrorSheet
);

Hooks.on("renderActiveEffectConfig", documents.ActiveEffect5e.onRenderActiveEffectConfig);

Hooks.on("targetToken", canvas.Token5e.onTargetToken);

Hooks.on("renderCombatTracker", (app, html, data) => app.renderGroups(html instanceof HTMLElement ? html : html[0]));

Hooks.on("preCreateScene", (doc, createData, options, userId) => {
  // Set default grid units based on metric length setting
  const units = utils.defaultUnits("length");
  if ( (units !== dnd5e.grid.units) && !foundry.utils.getProperty(createData, "grid.distance")
    && !foundry.utils.getProperty(createData, "grid.units") ) {
    const C = CONFIG.DND5E.movementUnits;
    doc.updateSource({
      grid: {
        // TODO: Replace with `convertLength` method once added
        distance: dnd5e.grid.distance * (C[dnd5e.grid.units]?.conversion ?? 1) / (C[units]?.conversion ?? 1), units
      }
    });
  }
});

// TODO: Generalize this logic and make it available in the re-designed transform application.
Hooks.on("dnd5e.transformActor", (subject, target, d, options) => {
  const isLegacy = game.settings.get("dnd5e", "rulesVersion") === "legacy";
  if ( (options.preset !== "wildshape") || !subject.classes?.druid || isLegacy ) return;
  let temp = subject.classes.druid.system.levels;
  if ( subject.classes.druid.subclass?.identifier === "moon" ) temp *= 3;
  d.system.attributes.hp.temp = temp;
});

/* -------------------------------------------- */
/*  Backported Fixes                            */
/* -------------------------------------------- */

/**
 * FIXME: Remove when v12 support dropped or https://github.com/foundryvtt/foundryvtt/issues/12023 backported.
 * @ignore
 */
function patchFromUuid() {
  const _resolveEmbedded = function(parent, parts, {invalid=false}={}) {
    let doc = parent;
    while ( doc && (parts.length > 1) ) {
      const [embeddedName, embeddedId] = parts.splice(0, 2);
      doc = doc.getEmbeddedDocument(embeddedName, embeddedId, {invalid});
    }
    return doc;
  };

  // Patch fromUuid to call our wrapped parseUuid in order to correctly resolve relative UUIDs on grandchild embedded
  // Documents.
  window.fromUuid = async function(uuid, options={}) {
    if ( !uuid ) return null;
    /** @deprecated since v11 */
    if ( foundry.utils.getType(options) !== "Object" ) {
      foundry.utils.logCompatibilityWarning("Passing a relative document as the second parameter to fromUuid is "
        + "deprecated. Please pass it within an options object instead.", {since: 11, until: 13});
      options = {relative: options};
    }
    const {relative, invalid=false} = options;
    let {type, id, primaryId, collection, embedded, doc} = parseUuid(uuid, {relative});
    if ( collection instanceof CompendiumCollection ) {
      if ( type === "Folder" ) return collection.folders.get(id);
      doc = await collection.getDocument(primaryId ?? id);
    }
    else doc = doc ?? collection?.get(primaryId ?? id, {invalid});
    if ( embedded.length ) doc = _resolveEmbedded(doc, embedded, {invalid});
    return doc || null;
  };
}

/* -------------------------------------------- */
/*  Bundled Module Exports                      */
/* -------------------------------------------- */

export {
  applications,
  canvas,
  dataModels,
  dice,
  documents,
  enrichers,
  Filter,
  migrations,
  registry,
  utils,
  DND5E
};
