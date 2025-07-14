import { log } from "./utils.mjs";

/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs.
 * @param {object} [options={}]
 * @param {boolean} [options.bypassVersionCheck=false]  Bypass certain migration restrictions gated behind system
 *                                                      version stored in item stats.
 * @returns {Promise}      A Promise which resolves once the migration is completed
 */
export async function migrateWorld({ bypassVersionCheck=false }={}) {
  const version = game.system.version;
  const progress = ui.notifications.info("MIGRATION.5eBegin", {
    console: false, format: { version }, permanent: true, progress: true
  });
  const { packs, packDocuments } = game.packs.reduce((obj, pack) => {
    if ( _shouldMigrateCompendium(pack) ) {
      obj.packs.push(pack);
      obj.packDocuments += pack.index.size;
    }
    return obj;
  }, { packs: [], packDocuments: 0 });
  const totalDocuments = game.actors.size + game.items.size + game.macros.size + game.tables.size
    + game.scenes.reduce((total, s) => total + s.tokens.size, 0) + packDocuments;
  let migrated = 0;
  const incrementProgress = () => progress.update({ pct: ++migrated / totalDocuments });

  const migrationData = await getMigrationData();
  await migrateSettings();
  let hasErrors = false;
  const logError = (err, type, name) => {
    err.message = `Failed dnd5e system migration for ${type} ${name}: ${err.message}`;
    console.error(err);
    hasErrors = true;
  };

  // Migrate World Actors
  const actors = game.actors.map(a => [a, true])
    .concat(Array.from(game.actors.invalidDocumentIds).map(id => [game.actors.getInvalid(id), false]));
  for ( const [actor, valid] of actors ) {
    try {
      const flags = { bypassVersionCheck, persistSourceMigration: false };
      const source = valid ? actor.toObject() : game.data.actors.find(a => a._id === actor.id);
      const version = actor._stats.systemVersion;
      let updateData = migrateActorData(actor, source, migrationData, flags, { actorUuid: actor.uuid });
      if ( !foundry.utils.isEmpty(updateData) ) {
        log(`Migrating Actor document ${actor.name}`);
        if ( flags.persistSourceMigration ) {
          updateData = foundry.utils.mergeObject(source, updateData, {inplace: false});
        }
        await actor.update(updateData, {
          enforceTypes: false, diff: valid && !flags.persistSourceMigration,
          recursive: !flags.persistSourceMigration, render: false
        });
      }
      if ( actor.effects && actor.items && foundry.utils.isNewerVersion("3.0.3", version) ) {
        const deleteIds = _duplicatedEffects(actor);
        if ( deleteIds.size ) await actor.deleteEmbeddedDocuments("ActiveEffect", Array.from(deleteIds), {
          render: false
        });
      }
    } catch(err) {
      logError(err, "Actor", actor.name);
    }
    incrementProgress();
  }

  // Migrate World Items
  const items = game.items.map(i => [i, true])
    .concat(Array.from(game.items.invalidDocumentIds).map(id => [game.items.getInvalid(id), false]));
  for ( const [item, valid] of items ) {
    try {
      const flags = { bypassVersionCheck, persistSourceMigration: false };
      const source = valid ? item.toObject() : game.data.items.find(i => i._id === item.id);
      let updateData = migrateItemData(item, source, migrationData, flags);
      if ( !foundry.utils.isEmpty(updateData) ) {
        log(`Migrating Item document ${item.name}`);
        if ( flags.persistSourceMigration ) {
          if ( "effects" in updateData ) updateData.effects = source.effects.map(effect => foundry.utils.mergeObject(
            effect, updateData.effects.find(e => e._id === effect._id) ?? {}, { inplace: false, performDeletions: true }
          ));
          updateData = foundry.utils.mergeObject(source, updateData, { inplace: false, performDeletions: true });
        }
        await item.update(updateData, {
          enforceTypes: false, diff: valid && !flags.persistSourceMigration,
          recursive: !flags.persistSourceMigration, render: false
        });
      }
    } catch(err) {
      logError(err, "Item", item.name);
    }
    incrementProgress();
  }

  // Migrate World Macros
  for ( const m of game.macros ) {
    try {
      const updateData = migrateMacroData(m.toObject(), migrationData);
      if ( !foundry.utils.isEmpty(updateData) ) {
        log(`Migrating Macro document ${m.name}`);
        await m.update(updateData, {enforceTypes: false, render: false});
      }
    } catch(err) {
      logError(err, "Macro", m.name);
    }
    incrementProgress();
  }

  // Migrate World Roll Tables
  for ( const table of game.tables ) {
    try {
      const updateData = migrateRollTableData(table.toObject(), migrationData);
      if ( !foundry.utils.isEmpty(updateData) ) {
        log(`Migrating RollTable document ${table.name}`);
        await table.update(updateData, { enforceTypes: false, render: false });
      }
    } catch(err) {
      logError(err, "RollTable", table.name);
    }
    incrementProgress();
  }

  // Migrate Actor Override Tokens
  for ( const s of game.scenes ) {
    try {
      const updateData = migrateSceneData(s, migrationData);
      if ( !foundry.utils.isEmpty(updateData) ) {
        log(`Migrating Scene document ${s.name}`);
        await s.update(updateData, {enforceTypes: false, render: false});
      }
    } catch(err) {
      logError(err, "Scene", s.name);
    }

    // Migrate ActorDeltas individually in order to avoid issues with ActorDelta bulk updates.
    for ( const token of s.tokens ) {
      if ( token.actorLink || !token.actor ) {
        incrementProgress();
        continue;
      }
      try {
        const flags = { bypassVersionCheck, persistSourceMigration: false };
        const source = token.actor.toObject();
        let updateData = migrateActorData(token.actor, source, migrationData, flags, { actorUuid: token.actor.uuid });
        if ( !foundry.utils.isEmpty(updateData) ) {
          log(`Migrating ActorDelta document ${token.actor.name} [${token.delta.id}] in Scene ${s.name}`);
          if ( flags.persistSourceMigration ) {
            updateData = foundry.utils.mergeObject(source, updateData, { inplace: false });
          } else {
            // Workaround for core issue of bulk updating ActorDelta collections.
            ["items", "effects"].forEach(col => {
              for ( const [i, update] of (updateData[col] ?? []).entries() ) {
                const original = token.actor[col].get(update._id);
                updateData[col][i] = foundry.utils.mergeObject(original.toObject(), update, { inplace: false });
              }
            });
          }
          await token.actor.update(updateData, {
            enforceTypes: false, diff: !flags.persistSourceMigration,
            recursive: !flags.persistSourceMigration, render: false
          });
        }
      } catch(err) {
        logError(err, "ActorDelta", `[${token.id}]`);
      }
      incrementProgress();
    }
  }

  // Migrate World Compendium Packs
  for ( let p of packs ) {
    await migrateCompendium(p, { incrementProgress });
  }
  const legacyFolder = game.folders.find(f => f.type === "Compendium" && f.name === "D&D SRD Content");
  if ( legacyFolder ) legacyFolder.update({ name: "D&D Legacy Content" });

  // Set the migration as complete
  game.settings.set("dnd5e", "systemMigrationVersion", game.system.version);
  progress.element?.classList.add(hasErrors ? "warning" : "success");
  progress.update({ message: "MIGRATION.5eComplete", format: { version }, pct: 1 });
}

/* -------------------------------------------- */

/**
 * Determine whether a compendium pack should be migrated during `migrateWorld`.
 * @param {Compendium} pack
 * @returns {boolean}
 */
function _shouldMigrateCompendium(pack) {
  // We only care about actor, item or scene migrations
  if ( !["Actor", "Item", "Scene"].includes(pack.documentName) ) return false;

  // World compendiums should all be migrated, system ones should never by migrated
  if ( pack.metadata.packageType === "world" ) return true;
  if ( pack.metadata.packageType === "system" ) return false;

  // Module compendiums should only be migrated if they don't have a download or manifest URL
  const module = game.modules.get(pack.metadata.packageName);
  return !module.download && !module.manifest;
}

/* -------------------------------------------- */

/**
 * Apply migration rules to all Documents within a single Compendium pack
 * @param {CompendiumCollection} pack       Pack to be migrated.
 * @param {object} [options={}]
 * @param {boolean} [options.bypassVersionCheck=false]  Bypass certain migration restrictions gated behind system
 *                                                      version stored in item stats.
 * @param {Function} [options.incrementProgress]        Function that can be called to increment the progress bar.
 * @param {boolean} [options.strict=false]  Migrate errors should stop the whole process.
 * @returns {Promise}
 */
export async function migrateCompendium(pack, { bypassVersionCheck=false, incrementProgress, strict=false }={}) {
  const documentName = pack.documentName;
  if ( !["Actor", "Item", "Scene"].includes(documentName) ) return;

  const migrationData = await getMigrationData();

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  try {
    await pack.configure({locked: false});
    game.compendiumArt.enabled = false;

    // Begin by requesting server-side data model migration and get the migrated content
    const documents = await pack.getDocuments();

    // Iterate over compendium entries - applying fine-tuned migration functions
    for ( let doc of documents ) {
      let updateData = {};
      try {
        const flags = { bypassVersionCheck, persistSourceMigration: false };
        const source = doc.toObject();
        switch ( documentName ) {
          case "Actor":
            updateData = migrateActorData(doc, source, migrationData, flags, { actorUuid: doc.uuid });
            if ( (documentName === "Actor") && source.effects && source.items
              && foundry.utils.isNewerVersion("3.0.3", source._stats.systemVersion) ) {
              const deleteIds = _duplicatedEffects(source);
              if ( deleteIds.size ) {
                if ( flags.persistSourceMigration ) source.effects = source.effects.filter(e => !deleteIds.has(e._id));
                else await doc.deleteEmbeddedDocuments("ActiveEffect", Array.from(deleteIds));
              }
            }
            break;
          case "Item":
            updateData = migrateItemData(doc, source, migrationData, flags);
            break;
          case "Scene":
            updateData = migrateSceneData(source, migrationData, flags);
            break;
        }

        // Save the entry, if data was changed
        if ( foundry.utils.isEmpty(updateData) ) continue;
        if ( flags.persistSourceMigration ) updateData = foundry.utils.mergeObject(source, updateData);
        await doc.update(updateData, { diff: !flags.persistSourceMigration });
        log(`Migrated ${documentName} document ${doc.name} in Compendium ${pack.collection}`);
      }

      // Handle migration failures
      catch(err) {
        err.message = `Failed dnd5e system migration for document ${doc.name} in pack ${pack.collection}: ${err.message}`;
        console.error(err);
        if ( strict ) throw err;
      }

      finally {
        incrementProgress?.();
      }
    }

    log(`Migrated all ${documentName} documents from Compendium ${pack.collection}`);
  } finally {
    // Apply the original locked status for the pack
    await pack.configure({locked: wasLocked});
    game.compendiumArt.enabled = true;
  }
}

/* -------------------------------------------- */

/**
 * Re-parents compendia from one top-level folder to another.
 * @param {string} from  The name of the source folder.
 * @param {string} to    The name of the destination folder.
 * @returns {Promise<Folder[]> | undefined}
 */
export function reparentCompendiums(from, to) {
  const compendiumFolders = new Map();
  for ( const folder of game.folders ) {
    if ( folder.type !== "Compendium" ) continue;
    if ( folder.folder ) {
      let folders = compendiumFolders.get(folder.folder);
      if ( !folders ) {
        folders = [];
        compendiumFolders.set(folder.folder, folders);
      }
      folders.push(folder);
    }
    if ( folder.name === from ) from = folder;
    else if ( folder.name === to ) to = folder;
  }
  if ( !(from instanceof Folder) || !(to instanceof Folder) ) return;
  const config = game.settings.get("core", "compendiumConfiguration");

  // Re-parent packs directly under the source folder.
  Object.values(config).forEach(conf => {
    if ( conf.folder === from.id ) conf.folder = to.id;
  });

  game.settings.set("core", "compendiumConfiguration", config);

  // Re-parent folders directly under the source folder.
  const updates = (compendiumFolders.get(from) ?? []).map(f => ({ _id: f.id, folder: to.id }));
  return Folder.implementation.updateDocuments(updates).then(() => from.delete());
}

/* -------------------------------------------- */

/**
 * Update all compendium packs using the new system data model.
 * @param {object} [options={}]
 * @param {boolean} [options.bypassVersionCheck=false]  Bypass certain migration restrictions gated behind system
 *                                                      version stored in item stats.
 * @param {boolean} [options.migrate=true]  Also perform a system migration before refreshing.
 */
export async function refreshAllCompendiums(options) {
  for ( const pack of game.packs ) {
    await refreshCompendium(pack, options);
  }
}

/* -------------------------------------------- */

/**
 * Update all Documents in a compendium using the new system data model.
 * @param {CompendiumCollection} pack  Pack to refresh.
 * @param {object} [options={}]
 * @param {boolean} [options.bypassVersionCheck=false]  Bypass certain migration restrictions gated behind system
 *                                                      version stored in item stats.
 * @param {boolean} [options.migrate=true]  Also perform a system migration before refreshing.
 */
export async function refreshCompendium(pack, { bypassVersionCheck, migrate=true }={}) {
  if ( !pack?.documentName ) return;
  if ( migrate ) {
    try {
      await migrateCompendium(pack, { bypassVersionCheck, strict: true });
    } catch( err ) {
      err.message = `Failed dnd5e system migration pack ${pack.collection}: ${err.message}`;
      console.error(err);
      return;
    }
  }

  game.compendiumArt.enabled = false;
  const DocumentClass = CONFIG[pack.documentName].documentClass;
  const wasLocked = pack.locked;
  await pack.configure({locked: false});

  ui.notifications.info(`Beginning to refresh Compendium ${pack.collection}`);
  const documents = await pack.getDocuments();
  for ( const doc of documents ) {
    const data = doc.toObject();
    await doc.delete();
    await DocumentClass.create(data, {keepId: true, keepEmbeddedIds: true, pack: pack.collection});
  }
  await pack.configure({locked: wasLocked});
  game.compendiumArt.enabled = true;
  ui.notifications.info(`Refreshed all documents from Compendium ${pack.collection}`);
}

/* -------------------------------------------- */

/**
 * Apply 'smart' AC migration to a given Actor compendium. This will perform the normal AC migration but additionally
 * check to see if the actor has armor already equipped, and opt to use that instead.
 * @param {CompendiumCollection|string} pack  Pack or name of pack to migrate.
 * @returns {Promise}
 */
export async function migrateArmorClass(pack) {
  if ( typeof pack === "string" ) pack = game.packs.get(pack);
  if ( pack.documentName !== "Actor" ) return;
  const wasLocked = pack.locked;
  await pack.configure({locked: false});
  const actors = await pack.getDocuments();
  const updates = [];
  const armor = new Set(Object.keys(CONFIG.DND5E.armorTypes));

  for ( const actor of actors ) {
    try {
      log(`Migrating ${actor.name}...`);
      const src = actor.toObject();
      const update = {_id: actor.id};

      // Perform the normal migration.
      _migrateActorAC(src, update);
      // TODO: See if AC migration within DataModel is enough to handle this
      updates.push(update);

      // CASE 1: Armor is equipped
      const hasArmorEquipped = actor.itemTypes.equipment.some(e => {
        return armor.has(e.system.type.value) && e.system.equipped;
      });
      if ( hasArmorEquipped ) update["system.attributes.ac.calc"] = "default";

      // CASE 2: NPC Natural Armor
      else if ( src.type === "npc" ) update["system.attributes.ac.calc"] = "natural";
    } catch(e) {
      console.warn(`Failed to migrate armor class for Actor ${actor.name}`, e);
    }
  }

  await Actor.implementation.updateDocuments(updates, {pack: pack.collection});
  await pack.getDocuments(); // Force a re-prepare of all actors.
  await pack.configure({locked: wasLocked});
  log(`Migrated the AC of all Actors from Compendium ${pack.collection}`);
}

/* -------------------------------------------- */

/**
 * Migrate system settings to new data types.
 */
export async function migrateSettings() {
  // Migrate Disable Experience Tracking to Leveling Mode
  const disableExperienceTracking = game.settings.storage.get("world")
    ?.find(s => s.key === "dnd5e.disableExperienceTracking")?.value;
  const levelingMode = game.settings.storage.get("world")?.find(s => s.key === "dnd5e.levelingMode")?.value;
  if ( (disableExperienceTracking !== undefined) && (levelingMode === undefined) ) {
    await game.settings.set("dnd5e", "levelingMode", "noxp");
  }
}

/* -------------------------------------------- */
/*  Document Type Migration Helpers             */
/* -------------------------------------------- */

/**
 * Migrate a single Actor document to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {Actor5e} actor               Full actor instance.
 * @param {object} actorData            The actor data object to update.
 * @param {object} [migrationData]      Additional data to perform the migration.
 * @param {object} [flags={}]           Track the needs migration flag.
 * @param {object} [options]
 * @param {string} [options.actorUuid]  The UUID of the actor.
 * @returns {object}                    The updateData to apply.
 */
export function migrateActorData(actor, actorData, migrationData, flags={}, { actorUuid }={}) {
  const updateData = {};
  _migrateTokenImage(actorData, updateData);
  _migrateActorAC(actorData, updateData);
  _migrateActorFlags(actorData, updateData);
  _migrateActorMovementSenses(actorData, updateData);

  // Migrate embedded effects
  if ( actorData.effects ) {
    const effects = migrateEffects(actorData, migrationData);
    if ( foundry.utils.isNewerVersion("3.1.0", actorData._stats?.systemVersion) ) {
      migrateCopyActorTransferEffects(actorData, effects, { actorUuid });
    }
    if ( effects.length > 0 ) updateData.effects = effects;
  }

  // Set source rules version to Legacy
  if ( foundry.utils.isNewerVersion("4.0.0", actorData._stats?.systemVersion) || flags.bypassVersionCheck ) {
    updateData["system.source.rules"] = "2014";
  }

  // Migrate Owned Items
  if ( !actorData.items ) return updateData;
  const items = actor.items.reduce((arr, i) => {
    // Migrate the Owned Item
    const itemData = i instanceof CONFIG.Item.documentClass ? i.toObject() : i;
    const itemFlags = { bypassVersionCheck: flags.bypassVersionCheck ?? false, persistSourceMigration: false };
    let itemUpdate = migrateItemData(i, itemData, migrationData, itemFlags);

    if ( (itemData.type === "background") && (actorData.system?.details?.background !== itemData._id) ) {
      updateData["system.details.background"] = itemData._id;
    }

    // Prepared, Equipped, and Proficient for NPC actors
    if ( actorData.type === "npc" ) {
      if (foundry.utils.getProperty(itemData.system, "prepared") === false) itemUpdate["system.prepared"] = 1;
      if (foundry.utils.getProperty(itemData.system, "equipped") === false) itemUpdate["system.equipped"] = true;
    }

    // Update the Owned Item
    if ( itemFlags.persistSourceMigration ) flags.persistSourceMigration = true;
    arr.push({ itemData, itemUpdate });

    // Update tool expertise.
    if ( actorData.system.tools ) {
      const hasToolProf = itemData.system.type?.baseItem in actorData.system.tools;
      if ( (itemData.type === "tool") && (itemData.system.proficient > 1) && hasToolProf ) {
        updateData[`system.tools.${itemData.system.type.baseItem}.value`] = itemData.system.proficient;
      }
    }

    return arr;
  }, []).map(({ itemData, itemUpdate }) => {
    if ( flags.persistSourceMigration ) {
      if ( "effects" in itemUpdate ) itemUpdate.effects = itemData.effects.map(effect => foundry.utils.mergeObject(
        effect, itemUpdate.effects.find(e => e._id === effect._id) ?? {}, { inplace: false, performDeletions: true }
      ));
      itemUpdate = foundry.utils.mergeObject(itemData, itemUpdate, { inplace: false, performDeletions: true });
    }
    return foundry.utils.isEmpty(itemUpdate) ? null : { ...itemUpdate, _id: itemData._id };
  }).filter(_ => _);
  if ( items.length > 0 ) updateData.items = items;

  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate a single Item document to incorporate latest data model changes
 *
 * @param {Item5e} item             Full item instance.
 * @param {object} itemData         Item data to migrate.
 * @param {object} [migrationData]  Additional data to perform the migration.
 * @param {object} [flags={}]       Track the needs migration flag.
 * @returns {object}                The updateData to apply.
 */
export function migrateItemData(item, itemData, migrationData, flags={}) {
  const updateData = {};
  _migrateDocumentIcon(itemData, updateData, migrationData);
  _migrateItemUses(item, itemData, updateData, flags);

  // Migrate embedded effects
  if ( itemData.effects ) {
    const riders = foundry.utils.getProperty(itemData, "flags.dnd5e.riders.effect");
    if ( riders?.length ) updateData["flags.dnd5e.riders.effect"] = riders;
    const effects = migrateEffects(itemData, migrationData, updateData, flags);
    if ( riders?.length === updateData["flags.dnd5e.riders.effect"]?.length ) {
      delete updateData["flags.dnd5e.riders.effect"];
    }
    if ( effects.length > 0 ) updateData.effects = effects;
  }

  // Set source rules version to Legacy
  if ( foundry.utils.isNewerVersion("4.0.0", itemData._stats?.systemVersion) || flags.bypassVersionCheck ) {
    updateData["system.source.rules"] = "2014";
    if ( Object.hasOwn(item.system, "identifier") && !itemData.system?.identifier ) {
      updateData["system.identifier"] = item.identifier;
    }
  }

  // Migrate properties
  const migratedProperties = foundry.utils.getProperty(itemData, "flags.dnd5e.migratedProperties");
  if ( migratedProperties?.length ) {
    flags.persistSourceMigration = true;
    const properties = new Set(foundry.utils.getProperty(itemData, "system.properties") ?? [])
      .union(new Set(migratedProperties));
    updateData["system.properties"] = Array.from(properties);
    updateData["flags.dnd5e.-=migratedProperties"] = null;
  }

  if ( foundry.utils.getProperty(itemData, "flags.dnd5e.persistSourceMigration") ) {
    flags.persistSourceMigration = true;
    updateData["flags.dnd5e.-=persistSourceMigration"] = null;
  }

  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate any active effects attached to the provided parent.
 * @param {object} parent            Data of the parent being migrated.
 * @param {object} [migrationData]   Additional data to perform the migration.
 * @param {object} [itemUpdateData]  Update data for the item to apply changes back to item.
 * @param {object} [flags={}]        Track the needs migration flag.
 * @returns {object[]}               Updates to apply on the embedded effects.
 */
export function migrateEffects(parent, migrationData, itemUpdateData, flags={}) {
  if ( !parent.effects ) return [];
  return parent.effects.reduce((arr, e) => {
    const effectData = e instanceof CONFIG.ActiveEffect.documentClass ? e.toObject() : e;
    let effectUpdate = migrateEffectData(effectData, migrationData, { parent });
    if ( effectData.flags?.dnd5e?.rider ) {
      itemUpdateData["flags.dnd5e.riders.effect"] ??= [];
      itemUpdateData["flags.dnd5e.riders.effect"].push(effectData._id);
      effectUpdate["flags.dnd5e.-=rider"] = null;
    }
    if ( effectData.flags?.dnd5e?.persistSourceMigration ) {
      flags.persistSourceMigration = true;
      effectUpdate["flags.dnd5e.-=persistSourceMigration"] = null;
    }
    if ( !foundry.utils.isEmpty(effectUpdate) ) {
      effectUpdate._id = effectData._id;
      arr.push(foundry.utils.expandObject(effectUpdate));
    }
    return arr;
  }, []);
}

/* -------------------------------------------- */

/**
 * Migrates transfer effects on items belonging to this actor to "real" effects on the actor.
 * @param {object} actor                 The parent actor.
 * @param {object[]} effects             An array of new effects to add.
 * @param {object} [options]             Additional options.
 * @param {string} [options.actorUuid]   UUID of the parent actor
 */
export const migrateCopyActorTransferEffects = function(actor, effects, { actorUuid }={}) {
  if ( !actor.items ) return;

  for ( const item of actor.items ) {
    for ( const effect of item.effects ) {
      if ( !effect.transfer ) continue;
      if ( !isSpellOrScroll(item) ) continue;
      if ( effect.disabled ) continue;

      const newEffect = foundry.utils.deepClone(effect);
      newEffect.transfer = false;
      if ( actorUuid ) newEffect.origin = `${actorUuid}.Item.${item._id}.ActiveEffect.${effect._id}`;
      delete newEffect._id;
      effects.push(newEffect);
    }
  }
};

/* -------------------------------------------- */

/**
 * Migrate the provided active effect data.
 * @param {object} effect            Effect data to migrate.
 * @param {object} [migrationData]   Additional data to perform the migration.
 * @param {object} [options]         Additional options.
 * @param {object} [options.parent]  Parent of this effect.
 * @returns {object}                 The updateData to apply.
 */
export const migrateEffectData = function(effect, migrationData, { parent }={}) {
  const updateData = {};
  _migrateDocumentIcon(effect, updateData, {...migrationData, field: "img"});
  _migrateEffectArmorClass(effect, updateData);
  if ( foundry.utils.isNewerVersion("3.1.0", effect._stats?.systemVersion ?? parent?._stats?.systemVersion) ) {
    _migrateTransferEffect(effect, parent, updateData);
  }
  return updateData;
};

/* -------------------------------------------- */

/**
 * Migrate a single Macro document to incorporate latest data model changes.
 * @param {object} macro            Macro data to migrate
 * @param {object} [migrationData]  Additional data to perform the migration
 * @returns {object}                The updateData to apply
 */
export const migrateMacroData = function(macro, migrationData) {
  const updateData = {};
  _migrateDocumentIcon(macro, updateData, migrationData);
  _migrateMacroCommands(macro, updateData);
  return updateData;
};

/* -------------------------------------------- */

/**
 * Migrate a single RollTable document to incorporate the latest data model changes.
 * @param {object} table            Roll table data to migrate.
 * @param {object} [migrationData]  Additional data to perform the migration.
 * @returns {object}                The update delta to apply.
 */
export function migrateRollTableData(table, migrationData) {
  const updateData = {};
  _migrateDocumentIcon(table, updateData, migrationData);
  if ( !table.results?.length ) return updateData;
  const results = table.results.reduce((arr, result) => {
    const resultUpdate = {};
    _migrateDocumentIcon(result, resultUpdate, migrationData);
    if ( !foundry.utils.isEmpty(resultUpdate) ) {
      resultUpdate._id = result._id;
      arr.push(foundry.utils.expandObject(resultUpdate));
    }
    return arr;
  }, []);
  if ( results.length ) updateData.results = results;
  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate a single Scene document to incorporate changes to the data model of its actor data overrides
 * Return an Object of updateData to be applied
 * @param {object} scene            The Scene data to Update
 * @param {object} [migrationData]  Additional data to perform the migration
 * @returns {object}                The updateData to apply
 */
export const migrateSceneData = function(scene, migrationData) {
  const tokens = scene.tokens.reduce((arr, token) => {
    const t = token instanceof foundry.abstract.DataModel ? token.toObject() : token;
    const update = {};
    _migrateTokenImage(t, update);
    if ( !game.actors.has(t.actorId) ) update.actorId = null;
    if ( !foundry.utils.isEmpty(update) ) arr.push({ ...update, _id: t._id });
    return arr;
  }, []);
  if ( tokens.length ) return { tokens };
  return {};
};

/* -------------------------------------------- */

/**
 * Fetch bundled data for large-scale migrations.
 * @returns {Promise<object>}  Object mapping original system icons to their core replacements.
 */
export const getMigrationData = async function() {
  const data = {};
  try {
    const icons = await fetch("systems/dnd5e/json/icon-migration.json");
    const spellIcons = await fetch("systems/dnd5e/json/spell-icon-migration.json");
    data.iconMap = {...await icons.json(), ...await spellIcons.json()};
  } catch(err) {
    console.warn(`Failed to retrieve icon migration data: ${err.message}`);
  }
  return data;
};

/* -------------------------------------------- */
/*  Low level migration utilities
/* -------------------------------------------- */

/**
 * Identify effects that might have been duplicated when legacyTransferral was disabled.
 * @param {object} parent   Data of the actor being migrated.
 * @returns {Set<string>}   IDs of effects to delete from the actor.
 * @private
 */
function _duplicatedEffects(parent) {
  const deleteIds = new Set();
  for ( const item of parent.items ) {
    for ( const effect of item.effects ?? [] ) {
      if ( !effect.transfer ) continue;
      const match = parent.effects.find(t => {
        const diff = foundry.utils.diffObject(t, effect);
        return t.origin?.endsWith(`Item.${item._id}`) && !("changes" in diff) && !deleteIds.has(t._id);
      });
      if ( match ) deleteIds.add(match._id);
    }
  }
  return deleteIds;
}

/* -------------------------------------------- */

/**
 * Migrate the actor attributes.ac.value to the new ac.flat override field.
 * @param {object} actorData   Actor data being migrated.
 * @param {object} updateData  Existing updates being applied to actor. *Will be mutated.*
 * @returns {object}           Modified version of update data.
 * @private
 */
function _migrateActorAC(actorData, updateData) {
  const ac = actorData.system?.attributes?.ac;
  // If the actor has a numeric ac.value, then their AC has not been migrated to the auto-calculation schema yet.
  if ( Number.isNumeric(ac?.value) ) {
    updateData["system.attributes.ac.flat"] = parseInt(ac.value);
    updateData["system.attributes.ac.calc"] = actorData.type === "npc" ? "natural" : "flat";
    updateData["system.attributes.ac.-=value"] = null;
    return updateData;
  }

  // Migrate ac.base in custom formulas to ac.armor
  if ( (typeof ac?.formula === "string") && ac?.formula.includes("@attributes.ac.base") ) {
    updateData["system.attributes.ac.formula"] = ac.formula.replaceAll("@attributes.ac.base", "@attributes.ac.armor");
  }

  // Protect against string values created by character sheets or importers that don't enforce data types
  if ( (typeof ac?.flat === "string") && Number.isNumeric(ac.flat) ) {
    updateData["system.attributes.ac.flat"] = parseInt(ac.flat);
  }

  // Remove invalid AC formula strings.
  if ( ac?.formula ) {
    try {
      const roll = new Roll(ac.formula);
      roll.evaluateSync();
    } catch( e ) {
      updateData["system.attributes.ac.formula"] = "";
    }
  }

  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate the actor flags that have been deprecated.
 * @param {object} actorData   Actor data being migrated.
 * @param {object} updateData  Existing updates being applied to actor. *Will be mutated.*
 * @returns {object}           Modified version of update data.
 * @private
 */
function _migrateActorFlags(actorData, updateData) {
  const initiativeAdv = foundry.utils.getProperty(actorData, "flags.dnd5e.initiativeAdv");
  if ( initiativeAdv ) {
    const key = "system.attributes.init.roll.mode";
    updateData[key] = Math.min(1, (foundry.utils.getProperty(actorData, key) ?? 0) + 1);
    updateData["flags.dnd5e.-=initiativeAdv"] = null;
  }
  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate the actor movement & senses to replace `0` with `null`.
 * @param {object} actorData   Actor data being migrated.
 * @param {object} updateData  Existing updates being applied to actor. *Will be mutated.*
 * @returns {object}           Modified version of update data.
 * @private
 */
function _migrateActorMovementSenses(actorData, updateData) {
  if ( actorData._stats?.systemVersion && foundry.utils.isNewerVersion("2.4.0", actorData._stats.systemVersion) ) {
    for ( const key of Object.keys(CONFIG.DND5E.movementTypes) ) {
      const keyPath = `system.attributes.movement.${key}`;
      if ( foundry.utils.getProperty(actorData, keyPath) === 0 ) updateData[keyPath] = null;
    }
    for ( const key of Object.keys(CONFIG.DND5E.senses) ) {
      const keyPath = `system.attributes.senses.${key}`;
      if ( foundry.utils.getProperty(actorData, keyPath) === 0 ) updateData[keyPath] = null;
    }
  }
  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate any system token images from PNG to WEBP.
 * @param {object} actorData    Actor or token data to migrate.
 * @param {object} updateData   Existing update to expand upon.
 * @returns {object}            The updateData to apply
 * @private
 */
function _migrateTokenImage(actorData, updateData) {
  const oldSystemPNG = /^systems\/dnd5e\/tokens\/([a-z]+)\/([A-z]+).png$/;
  for ( const path of ["texture.src", "prototypeToken.texture.src"] ) {
    const v = foundry.utils.getProperty(actorData, path);
    if ( oldSystemPNG.test(v) ) {
      const [type, fileName] = v.match(oldSystemPNG).slice(1);
      updateData[path] = `systems/dnd5e/tokens/${type}/${fileName}.webp`;
    }
  }
  return updateData;
}

/* -------------------------------------------- */

/**
 * Convert system icons to use bundled core webp icons.
 * @param {object} document                                 Document data to migrate
 * @param {object} updateData                               Existing update to expand upon
 * @param {object} [migrationData={}]                       Additional data to perform the migration
 * @param {Object<string, string>} [migrationData.iconMap]  A mapping of system icons to core foundry icons
 * @param {string} [migrationData.field]                    The document field to migrate
 * @returns {object}                                        The updateData to apply
 * @private
 */
function _migrateDocumentIcon(document, updateData, {iconMap, field="img"}={}) {
  let path = document?.[field];
  if ( path && iconMap ) {
    if ( path.startsWith("/") || path.startsWith("\\") ) path = path.substring(1);
    const rename = iconMap[path];
    if ( rename ) updateData[field] = rename;
  }
  return updateData;
}

/* -------------------------------------------- */

/**
 * Change active effects that target AC.
 * @param {object} effect      Effect data to migrate.
 * @param {object} updateData  Existing update to expand upon.
 * @returns {object}           The updateData to apply.
 */
function _migrateEffectArmorClass(effect, updateData) {
  let containsUpdates = false;
  const changes = (effect.changes || []).map(c => {
    if ( c.key !== "system.attributes.ac.base" ) return c;
    c.key = "system.attributes.ac.armor";
    containsUpdates = true;
    return c;
  });
  if ( containsUpdates ) updateData.changes = changes;
  return updateData;
}

/* -------------------------------------------- */

/**
 * Move `uses.value` to `uses.spent` for items.
 * @param {Item5e} item        Full item instance.
 * @param {object} itemData    Item data to migrate.
 * @param {object} updateData  Existing update to expand upon.
 * @param {object} flags       Track the needs migration flag.
 */
function _migrateItemUses(item, itemData, updateData, flags) {
  const value = foundry.utils.getProperty(itemData, "flags.dnd5e.migratedUses");
  const max = foundry.utils.getProperty(item, "system.uses.max");
  if ( (value !== undefined) && (max !== undefined) && Number.isNumeric(value) && Number.isNumeric(max) ) {
    foundry.utils.setProperty(updateData, "system.uses.spent", parseInt(max) - parseInt(value));
    flags.persistSourceMigration = true;
  }
  if ( value !== undefined ) updateData["flags.dnd5e.-=migratedUses"] = null;
}

/* -------------------------------------------- */

/**
 * Disable transfer on effects on spell items
 * @param {object} effect      Effect data to migrate.
 * @param {object} parent      The parent of this effect.
 * @param {object} updateData  Existing update to expand upon.
 * @returns {object}           The updateData to apply.
 */
function _migrateTransferEffect(effect, parent, updateData) {
  if ( !effect.transfer ) return updateData;
  if ( !isSpellOrScroll(parent) ) return updateData;

  updateData.transfer = false;
  updateData.disabled = true;
  updateData["duration.startTime"] = null;
  updateData["duration.startRound"] = null;
  updateData["duration.startTurn"] = null;

  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate macros from the old 'dnd5e.rollItemMacro' and 'dnd5e.macros' commands to the new location.
 * @param {object} macro       Macro data to migrate.
 * @param {object} updateData  Existing update to expand upon.
 * @returns {object}           The updateData to apply.
 */
function _migrateMacroCommands(macro, updateData) {
  if ( macro.command.includes("game.dnd5e.rollItemMacro") ) {
    updateData.command = macro.command.replaceAll("game.dnd5e.rollItemMacro", "dnd5e.documents.macro.rollItem");
  } else if ( macro.command.includes("game.dnd5e.macros.") ) {
    updateData.command = macro.command.replaceAll("game.dnd5e.macros.", "dnd5e.documents.macro.");
  }
  return updateData;
}

/* -------------------------------------------- */

/**
 * A general tool to purge flags from all documents in a Compendium pack.
 * @param {CompendiumCollection} pack   The compendium pack to clean.
 * @private
 */
export async function purgeFlags(pack) {
  const cleanFlags = flags => {
    const flags5e = flags.dnd5e || null;
    return flags5e ? {dnd5e: flags5e} : {};
  };
  await pack.configure({locked: false});
  const content = await pack.getDocuments();
  for ( let doc of content ) {
    const update = {flags: cleanFlags(doc.flags)};
    if ( pack.documentName === "Actor" ) {
      update.items = doc.items.map(i => {
        i.flags = cleanFlags(i.flags);
        return i;
      });
    }
    await doc.update(update, {recursive: false});
    log(`Purged flags from ${doc.name}`);
  }
  await pack.configure({locked: true});
}

/* -------------------------------------------- */

/**
 * Returns whether given item data represents either a spell item or a spell scroll consumable
 * @param {object} item  The item data.
 * @returns {boolean}
 */
function isSpellOrScroll(item) {
  if ( (item.type === "consumable") && (item.system.type.value === "scroll") ) return true;
  return item.type === "spell";
}
