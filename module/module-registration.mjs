import ItemCompendium5e from "./applications/item/item-compendium.mjs";
import TableOfContentsCompendium from "./applications/journal/table-of-contents.mjs";
import { log } from "./utils.mjs";

/* -------------------------------------------- */
/*  Module Data                                 */
/* -------------------------------------------- */

/**
 * Scan module manifests for any data that should be integrated into the system configuration.
 */
export function registerModuleData() {
  log("Registering Module Data", { level: "groupCollapsed" });
  for ( const manifest of [game.system, ...game.modules.filter(m => m.active), game.world] ) {
    try {
      const complete = registerMethods.map(m => m(manifest)).filter(r => r);
      if ( complete.length ) log(`Registered ${manifest.title} data: ${complete.join(", ")}`);
    } catch(err) {
      log(`Error registering ${manifest.title}\n`, { extras: [err.message], level: "error" });
    }
  }
  console.groupEnd();
}

const registerMethods = [registerSourceBooks, registerSpellLists];

/* -------------------------------------------- */

/**
 * Register package source books from `flags.dnd5e.sourceBooks`.
 * @param {Module|System|World} manifest  Manifest from which to register data.
 * @returns {string|void}                 Description of the data registered.
 */
function registerSourceBooks(manifest) {
  if ( !manifest.flags.dnd5e?.sourceBooks ) return;
  Object.assign(CONFIG.DND5E.sourceBooks, manifest.flags.dnd5e.sourceBooks);
  return "source books";
}

/* -------------------------------------------- */

/**
 * Register package spell lists from `flags.dnd5e.spellLists`.
 * @param {Module|System|World} manifest  Manifest from which to register data.
 * @returns {string|void}                 Description of the data registered.
 */
function registerSpellLists(manifest) {
  if ( foundry.utils.getType(manifest.flags.dnd5e?.spellLists) !== "Array" ) return;
  manifest.flags.dnd5e.spellLists.forEach(uuid => dnd5e.registry.spellLists.register(uuid));
  return "spell lists";
}

/* -------------------------------------------- */
/*  Compendium Packs                            */
/* -------------------------------------------- */

/**
 * Apply any changes to compendium packs during the setup hook.
 */
export function setupModulePacks() {
  log("Setting Up Compendium Packs", { level: "groupCollapsed" });
  for ( const pack of game.packs ) {
    if ( pack.metadata.type === "Item" ) pack.applicationClass = ItemCompendium5e;
    try {
      const complete = setupMethods.map(m => m(pack)).filter(r => r);
      if ( complete.length ) log(`Finished setting up ${pack.metadata.label}: ${complete.join(", ")}`);
    } catch(err) {
      log(`Error setting up ${pack.title}\n`, { extras: [err.message], level: "error" });
    }
  }
  if ( sortingChanged ) game.settings.set("core", "collectionSortingModes", collectionSortingModes);
  console.groupEnd();
}

const setupMethods = [setupPackDisplay, setupPackSorting];

/* -------------------------------------------- */

/**
 * Set application based on `flags.dnd5e.display`.
 * @param {Compendium} pack  Pack to set up.
 * @returns {string|void}    Description of the step.
 */
function setupPackDisplay(pack) {
  const display = pack.metadata.flags.display ?? pack.metadata.flags.dnd5e?.display;
  if ( display !== "table-of-contents" ) return;
  pack.applicationClass = TableOfContentsCompendium;
  return "table of contents";
}

/* -------------------------------------------- */

let collectionSortingModes;
let sortingChanged = false;

/**
 * Set default sorting order based on `flags.dnd5e.sorting`.
 * @param {Compendium} pack  Pack to set up.
 * @returns {string|void}    Description of the step.
 */
function setupPackSorting(pack) {
  collectionSortingModes ??= game.settings.get("core", "collectionSortingModes") ?? {};
  if ( !pack.metadata.flags.dnd5e?.sorting || collectionSortingModes[pack.metadata.id] ) return;
  collectionSortingModes[pack.metadata.id] = pack.metadata.flags.dnd5e.sorting;
  sortingChanged = true;
  return "default sorting";
}
