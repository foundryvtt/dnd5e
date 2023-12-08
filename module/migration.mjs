/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @returns {Promise}      A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function() {
  const version = game.system.version;
  ui.notifications.info(game.i18n.format("MIGRATION.5eBegin", {version}), {permanent: true});

  const migrationData = await getMigrationData();

  // Migrate World Actors
  const actors = game.actors.map(a => [a, true])
    .concat(Array.from(game.actors.invalidDocumentIds).map(id => [game.actors.getInvalid(id), false]));
  for ( const [actor, valid] of actors ) {
    try {
      const flags = { persistSourceMigration: false };
      const source = valid ? actor.toObject() : game.data.actors.find(a => a._id === actor.id);
      let updateData = migrateActorData(source, migrationData, flags);
      if ( !foundry.utils.isEmpty(updateData) ) {
        console.log(`Migrating Actor document ${actor.name}`);
        if ( flags.persistSourceMigration ) {
          updateData = foundry.utils.mergeObject(source, updateData, {inplace: false});
        }
        await actor.update(updateData, {enforceTypes: false, diff: valid && !flags.persistSourceMigration});
      }
    } catch(err) {
      err.message = `Failed dnd5e system migration for Actor ${actor.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Items
  const items = game.items.map(i => [i, true])
    .concat(Array.from(game.items.invalidDocumentIds).map(id => [game.items.getInvalid(id), false]));
  for ( const [item, valid] of items ) {
    try {
      const flags = { persistSourceMigration: false };
      const source = valid ? item.toObject() : game.data.items.find(i => i._id === item.id);
      let updateData = migrateItemData(source, migrationData, flags);
      if ( !foundry.utils.isEmpty(updateData) ) {
        console.log(`Migrating Item document ${item.name}`);
        if ( flags.persistSourceMigration ) {
          updateData = foundry.utils.mergeObject(source, updateData, {inplace: false});
        }
        await item.update(updateData, {enforceTypes: false, diff: valid && !flags.persistSourceMigration});
      }
    } catch(err) {
      err.message = `Failed dnd5e system migration for Item ${item.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Macros
  for ( const m of game.macros ) {
    try {
      const updateData = migrateMacroData(m.toObject(), migrationData);
      if ( !foundry.utils.isEmpty(updateData) ) {
        console.log(`Migrating Macro document ${m.name}`);
        await m.update(updateData, {enforceTypes: false});
      }
    } catch(err) {
      err.message = `Failed dnd5e system migration for Macro ${m.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Roll Tables
  for ( const table of game.tables ) {
    try {
      const updateData = migrateRollTableData(table.toObject(), migrationData);
      if ( !foundry.utils.isEmpty(updateData) ) {
        console.log(`Migrating RollTable document ${table.name}`);
        await table.update(updateData, { enforceTypes: false });
      }
    } catch(err) {
      err.message = `Failed dnd5e system migration for RollTable ${table.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate Actor Override Tokens
  for ( const s of game.scenes ) {
    try {
      const updateData = migrateSceneData(s, migrationData);
      if ( !foundry.utils.isEmpty(updateData) ) {
        console.log(`Migrating Scene document ${s.name}`);
        await s.update(updateData, {enforceTypes: false});
      }
    } catch(err) {
      err.message = `Failed dnd5e system migration for Scene ${s.name}: ${err.message}`;
      console.error(err);
    }

    // Migrate ActorDeltas individually in order to avoid issues with ActorDelta bulk updates.
    for ( const token of s.tokens ) {
      try {
        const flags = { persistSourceMigration: false };
        const source = token.actor.toObject();
        let updateData = migrateActorData(source, migrationData, flags);
        if ( !foundry.utils.isEmpty(updateData) ) {
          console.log(`Migrating ActorDelta document ${token.actor.name} [${token.delta.id}] in Scene ${s.name}`);
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
          await token.actor.update(updateData, { enforceTypes: false, diff: !flags.persistSourceMigration });
        }
      } catch(err) {
        err.message = `Failed dnd5e system migration for ActorDelta ${token.actor.name}: ${err.message}`;
        console.error(err);
      }
    }
  }

  // Migrate World Compendium Packs
  for ( let p of game.packs ) {
    if ( p.metadata.packageType !== "world" ) continue;
    if ( !["Actor", "Item", "Scene"].includes(p.documentName) ) continue;
    await migrateCompendium(p);
  }

  // Set the migration as complete
  game.settings.set("dnd5e", "systemMigrationVersion", game.system.version);
  ui.notifications.info(game.i18n.format("MIGRATION.5eComplete", {version}), {permanent: true});
};

/* -------------------------------------------- */

/**
 * Apply migration rules to all Documents within a single Compendium pack
 * @param {CompendiumCollection} pack  Pack to be migrated.
 * @returns {Promise}
 */
export const migrateCompendium = async function(pack) {
  const documentName = pack.documentName;
  if ( !["Actor", "Item", "Scene"].includes(documentName) ) return;

  const migrationData = await getMigrationData();

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({locked: false});

  // Begin by requesting server-side data model migration and get the migrated content
  await pack.migrate();
  const documents = await pack.getDocuments();

  // Iterate over compendium entries - applying fine-tuned migration functions
  for ( let doc of documents ) {
    let updateData = {};
    try {
      const flags = { persistSourceMigration: false };
      const source = doc.toObject();
      switch (documentName) {
        case "Actor":
          updateData = migrateActorData(source, migrationData, flags);
          break;
        case "Item":
          updateData = migrateItemData(source, migrationData, flags);
          break;
        case "Scene":
          updateData = migrateSceneData(source, migrationData, flags);
          break;
      }

      // Save the entry, if data was changed
      if ( foundry.utils.isEmpty(updateData) ) continue;
      if ( flags.persistSourceMigration ) updateData = foundry.utils.mergeObject(source, updateData);
      await doc.update(updateData, { diff: !flags.persistSourceMigration });
      console.log(`Migrated ${documentName} document ${doc.name} in Compendium ${pack.collection}`);
    }

    // Handle migration failures
    catch(err) {
      err.message = `Failed dnd5e system migration for document ${doc.name} in pack ${pack.collection}: ${err.message}`;
      console.error(err);
    }
  }

  // Apply the original locked status for the pack
  await pack.configure({locked: wasLocked});
  console.log(`Migrated all ${documentName} documents from Compendium ${pack.collection}`);
};

/* -------------------------------------------- */

/**
 * Update all compendium packs using the new system data model.
 */
export async function refreshAllCompendiums() {
  for ( const pack of game.packs ) {
    await refreshCompendium(pack);
  }
}

/* -------------------------------------------- */

/**
 * Update all Documents in a compendium using the new system data model.
 * @param {CompendiumCollection} pack  Pack to refresh.
 */
export async function refreshCompendium(pack) {
  if ( !pack?.documentName ) return;
  dnd5e.moduleArt.suppressArt = true;
  const DocumentClass = CONFIG[pack.documentName].documentClass;
  const wasLocked = pack.locked;
  await pack.configure({locked: false});
  await pack.migrate();

  ui.notifications.info(`Beginning to refresh Compendium ${pack.collection}`);
  const documents = await pack.getDocuments();
  for ( const doc of documents ) {
    const data = doc.toObject();
    await doc.delete();
    await DocumentClass.create(data, {keepId: true, keepEmbeddedIds: true, pack: pack.collection});
  }
  await pack.configure({locked: wasLocked});
  dnd5e.moduleArt.suppressArt = false;
  ui.notifications.info(`Refreshed all documents from Compendium ${pack.collection}`);
}

/* -------------------------------------------- */

/**
 * Apply 'smart' AC migration to a given Actor compendium. This will perform the normal AC migration but additionally
 * check to see if the actor has armor already equipped, and opt to use that instead.
 * @param {CompendiumCollection|string} pack  Pack or name of pack to migrate.
 * @returns {Promise}
 */
export const migrateArmorClass = async function(pack) {
  if ( typeof pack === "string" ) pack = game.packs.get(pack);
  if ( pack.documentName !== "Actor" ) return;
  const wasLocked = pack.locked;
  await pack.configure({locked: false});
  const actors = await pack.getDocuments();
  const updates = [];
  const armor = new Set(Object.keys(CONFIG.DND5E.armorTypes));

  for ( const actor of actors ) {
    try {
      console.log(`Migrating ${actor.name}...`);
      const src = actor.toObject();
      const update = {_id: actor.id};

      // Perform the normal migration.
      _migrateActorAC(src, update);
      // TODO: See if AC migration within DataModel is enough to handle this
      updates.push(update);

      // CASE 1: Armor is equipped
      const hasArmorEquipped = actor.itemTypes.equipment.some(e => {
        return armor.has(e.system.armor?.type) && e.system.equipped;
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
  console.log(`Migrated the AC of all Actors from Compendium ${pack.collection}`);
};

/* -------------------------------------------- */
/*  Document Type Migration Helpers             */
/* -------------------------------------------- */

/**
 * Migrate a single Actor document to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {object} actor            The actor data object to update
 * @param {object} [migrationData]  Additional data to perform the migration
 * @param {object} [flags={}]       Track the needs migration flag.
 * @returns {object}                The updateData to apply
 */
export const migrateActorData = function(actor, migrationData, flags={}) {
  const updateData = {};
  _migrateTokenImage(actor, updateData);
  _migrateActorAC(actor, updateData);
  _migrateActorMovementSenses(actor, updateData);

  // Migrate embedded effects
  if ( actor.effects ) {
    const effects = migrateEffects(actor, migrationData);
    if ( effects.length > 0 ) updateData.effects = effects;
  }

  // Migrate Owned Items
  if ( !actor.items ) return updateData;
  const items = actor.items.reduce((arr, i) => {
    // Migrate the Owned Item
    const itemData = i instanceof CONFIG.Item.documentClass ? i.toObject() : i;
    const itemFlags = { persistSourceMigration: false };
    let itemUpdate = migrateItemData(itemData, migrationData, itemFlags);

    if ( (itemData.type === "background") && (actor.system?.details?.background !== itemData._id) ) {
      updateData["system.details.background"] = itemData._id;
    }

    // Prepared, Equipped, and Proficient for NPC actors
    if ( actor.type === "npc" ) {
      if (foundry.utils.getProperty(itemData.system, "preparation.prepared") === false) itemUpdate["system.preparation.prepared"] = true;
      if (foundry.utils.getProperty(itemData.system, "equipped") === false) itemUpdate["system.equipped"] = true;
    }

    // Update the Owned Item
    if ( !foundry.utils.isEmpty(itemUpdate) ) {
      if ( itemFlags.persistSourceMigration ) {
        itemUpdate = foundry.utils.mergeObject(itemData, itemUpdate, {inplace: false});
        flags.persistSourceMigration = true;
      }
      arr.push({ ...itemUpdate, _id: itemData._id });
    }

    // Update tool expertise.
    if ( actor.system.tools ) {
      const hasToolProf = itemData.system.baseItem in actor.system.tools;
      if ( (itemData.type === "tool") && (itemData.system.proficient > 1) && hasToolProf ) {
        updateData[`system.tools.${itemData.system.baseItem}.value`] = itemData.system.proficient;
      }
    }

    return arr;
  }, []);
  if ( items.length > 0 ) updateData.items = items;

  return updateData;
};

/* -------------------------------------------- */

/**
 * Migrate a single Item document to incorporate latest data model changes
 *
 * @param {object} item             Item data to migrate
 * @param {object} [migrationData]  Additional data to perform the migration
 * @param {object} [flags={}]       Track the needs migration flag.
 * @returns {object}                The updateData to apply
 */
export function migrateItemData(item, migrationData, flags={}) {
  const updateData = {};
  _migrateDocumentIcon(item, updateData, migrationData);

  // Migrate embedded effects
  if ( item.effects ) {
    const effects = migrateEffects(item, migrationData);
    if ( effects.length > 0 ) updateData.effects = effects;
  }

  if ( foundry.utils.getProperty(item, "flags.dnd5e.persistSourceMigration") ) {
    flags.persistSourceMigration = true;
    updateData["flags.dnd5e.-=persistSourceMigration"] = null;
  }

  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate any active effects attached to the provided parent.
 * @param {object} parent           Data of the parent being migrated.
 * @param {object} [migrationData]  Additional data to perform the migration.
 * @returns {object[]}              Updates to apply on the embedded effects.
 */
export const migrateEffects = function(parent, migrationData) {
  if ( !parent.effects ) return {};
  return parent.effects.reduce((arr, e) => {
    const effectData = e instanceof CONFIG.ActiveEffect.documentClass ? e.toObject() : e;
    let effectUpdate = migrateEffectData(effectData, migrationData);
    if ( !foundry.utils.isEmpty(effectUpdate) ) {
      effectUpdate._id = effectData._id;
      arr.push(foundry.utils.expandObject(effectUpdate));
    }
    return arr;
  }, []);
};

/* -------------------------------------------- */

/**
 * Migrate the provided active effect data.
 * @param {object} effect           Effect data to migrate.
 * @param {object} [migrationData]  Additional data to perform the migration.
 * @returns {object}                The updateData to apply.
 */
export const migrateEffectData = function(effect, migrationData) {
  const updateData = {};
  _migrateDocumentIcon(effect, updateData, {...migrationData, field: "icon"});
  _migrateEffectArmorClass(effect, updateData);
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
    return t;
  });
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
      Roll.safeEval(roll.formula);
    } catch( e ) {
      updateData["system.attributes.ac.formula"] = "";
    }
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
    console.log(`Purged flags from ${doc.name}`);
  }
  await pack.configure({locked: true});
}
