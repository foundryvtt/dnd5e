/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @return {Promise}      A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function() {
  ui.notifications.info(`Applying DnD5E System Migration for version ${game.system.data.version}. Please be patient and do not close your game or shut down your server.`, {permanent: true});

  // Migrate World Actors
  for ( let a of game.actors.contents ) {
    try {
      const updateData = migrateActorData(a.data);
      if ( !foundry.utils.isObjectEmpty(updateData) ) {
        console.log(`Migrating Actor entity ${a.name}`);
        await a.update(updateData, {enforceTypes: false});
      }
    } catch(err) {
      err.message = `Failed dnd5e system migration for Actor ${a.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Items
  for ( let i of game.items.contents ) {
    try {
      const updateData = migrateItemData(i.toObject());
      if ( !foundry.utils.isObjectEmpty(updateData) ) {
        console.log(`Migrating Item entity ${i.name}`);
        await i.update(updateData, {enforceTypes: false});
      }
    } catch(err) {
      err.message = `Failed dnd5e system migration for Item ${i.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate Actor Override Tokens
  for ( let s of game.scenes.contents ) {
    try {
      const updateData = migrateSceneData(s.data);
      if ( !foundry.utils.isObjectEmpty(updateData) ) {
        console.log(`Migrating Scene entity ${s.name}`);
        await s.update(updateData, {enforceTypes: false});
        // If we do not do this, then synthetic token actors remain in cache
        // with the un-updated actorData.
        s.tokens.contents.forEach(t => t._actor = null);
      }
    } catch(err) {
      err.message = `Failed dnd5e system migration for Scene ${s.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Compendium Packs
  for ( let p of game.packs ) {
    if ( p.metadata.package !== "world" ) continue;
    if ( !["Actor", "Item", "Scene"].includes(p.metadata.entity) ) continue;
    await migrateCompendium(p);
  }

  // Set the migration as complete
  game.settings.set("dnd5e", "systemMigrationVersion", game.system.data.version);
  ui.notifications.info(`DnD5E System Migration to version ${game.system.data.version} completed!`, {permanent: true});
};

/* -------------------------------------------- */

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack
 * @return {Promise}
 */
export const migrateCompendium = async function(pack) {
  const entity = pack.metadata.entity;
  if ( !["Actor", "Item", "Scene"].includes(entity) ) return;

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
      switch (entity) {
        case "Actor":
          updateData = migrateActorData(doc.data);
          break;
        case "Item":
          updateData = migrateItemData(doc.toObject());
          break;
        case "Scene":
          updateData = migrateSceneData(doc.data);
          break;
      }

      // Save the entry, if data was changed
      if ( foundry.utils.isObjectEmpty(updateData) ) continue;
      await doc.update(updateData);
      console.log(`Migrated ${entity} entity ${doc.name} in Compendium ${pack.collection}`);
    }

    // Handle migration failures
    catch(err) {
      err.message = `Failed dnd5e system migration for entity ${doc.name} in pack ${pack.collection}: ${err.message}`;
      console.error(err);
    }
  }

  // Apply the original locked status for the pack
  await pack.configure({locked: wasLocked});
  console.log(`Migrated all ${entity} entities from Compendium ${pack.collection}`);
};

/* -------------------------------------------- */
/*  Entity Type Migration Helpers               */
/* -------------------------------------------- */

/**
 * Migrate a single Actor entity to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {object} actor    The actor data object to update
 * @return {Object}         The updateData to apply
 */
export const migrateActorData = function(actor) {
  const updateData = {};

  // Actor Data Updates
  if (actor.data) {
    _migrateActorMovement(actor, updateData);
    _migrateActorSenses(actor, updateData);
    _migrateActorType(actor, updateData);
  }

  // Migrate Owned Items
  if ( !actor.items ) return updateData;
  const items = actor.items.reduce((arr, i) => {
    // Migrate the Owned Item
    const itemData = i instanceof CONFIG.Item.documentClass ? i.toObject() : i;
    let itemUpdate = migrateItemData(itemData);

    // Prepared, Equipped, and Proficient for NPC actors
    if ( actor.type === "npc" ) {
      if (getProperty(itemData.data, "preparation.prepared") === false) itemUpdate["data.preparation.prepared"] = true;
      if (getProperty(itemData.data, "equipped") === false) itemUpdate["data.equipped"] = true;
      if (getProperty(itemData.data, "proficient") === false) itemUpdate["data.proficient"] = true;
    }

    // Update the Owned Item
    if ( !isObjectEmpty(itemUpdate) ) {
      itemUpdate._id = itemData._id;
      arr.push(expandObject(itemUpdate));
    }

    return arr;
  }, []);
  if ( items.length > 0 ) updateData.items = items;
  return updateData;
};

/* -------------------------------------------- */


/**
 * Scrub an Actor's system data, removing all keys which are not explicitly defined in the system template
 * @param {Object} actorData    The data object for an Actor
 * @return {Object}             The scrubbed Actor data
 */
function cleanActorData(actorData) {

  // Scrub system data
  const model = game.system.model.Actor[actorData.type];
  actorData.data = filterObject(actorData.data, model);

  // Scrub system flags
  const allowedFlags = CONFIG.DND5E.allowedActorFlags.reduce((obj, f) => {
    obj[f] = null;
    return obj;
  }, {});
  if ( actorData.flags.dnd5e ) {
    actorData.flags.dnd5e = filterObject(actorData.flags.dnd5e, allowedFlags);
  }

  // Return the scrubbed data
  return actorData;
}


/* -------------------------------------------- */

/**
 * Migrate a single Item entity to incorporate latest data model changes
 *
 * @param {object} item  Item data to migrate
 * @return {object}      The updateData to apply
 */
export const migrateItemData = function(item) {
  const updateData = {};
  _migrateItemAttunement(item, updateData);
  _migrateItemSpellcasting(item, updateData);
  return updateData;
};

/* -------------------------------------------- */

/**
 * Migrate a single Scene entity to incorporate changes to the data model of it's actor data overrides
 * Return an Object of updateData to be applied
 * @param {Object} scene  The Scene data to Update
 * @return {Object}       The updateData to apply
 */
export const migrateSceneData = function(scene) {
  const tokens = scene.tokens.map(token => {
    const t = token.toJSON();
    if (!t.actorId || t.actorLink) {
      t.actorData = {};
    }
    else if ( !game.actors.has(t.actorId) ){
      t.actorId = null;
      t.actorData = {};
    }
    else if ( !t.actorLink ) {
      const actorData = duplicate(t.actorData);
      actorData.type = token.actor?.type;
      const update = migrateActorData(actorData);
      ['items', 'effects'].forEach(embeddedName => {
        if (!update[embeddedName]?.length) return;
        const updates = new Map(update[embeddedName].map(u => [u._id, u]));
        t.actorData[embeddedName].forEach(original => {
          const update = updates.get(original._id);
          if (update) mergeObject(original, update);
        });
        delete update[embeddedName];
      });

      mergeObject(t.actorData, update);
    }
    return t;
  });
  return {tokens};
};

/* -------------------------------------------- */
/*  Low level migration utilities
/* -------------------------------------------- */

/**
 * Migrate the actor speed string to movement object
 * @private
 */
function _migrateActorMovement(actorData, updateData) {
  const ad = actorData.data;

  // Work is needed if old data is present
  const old = actorData.type === 'vehicle' ? ad?.attributes?.speed : ad?.attributes?.speed?.value;
  const hasOld = old !== undefined;
  if ( hasOld ) {

    // If new data is not present, migrate the old data
    const hasNew = ad?.attributes?.movement?.walk !== undefined;
    if ( !hasNew && (typeof old === "string") ) {
      const s = (old || "").split(" ");
      if ( s.length > 0 ) updateData["data.attributes.movement.walk"] = Number.isNumeric(s[0]) ? parseInt(s[0]) : null;
    }

    // Remove the old attribute
    updateData["data.attributes.-=speed"] = null;
  }
  return updateData
}

/* -------------------------------------------- */

/**
 * Migrate the actor traits.senses string to attributes.senses object
 * @private
 */
function _migrateActorSenses(actor, updateData) {
  const ad = actor.data;
  if ( ad?.traits?.senses === undefined ) return;
  const original = ad.traits.senses || "";
  if ( typeof original !== "string" ) return;

  // Try to match old senses with the format like "Darkvision 60 ft, Blindsight 30 ft"
  const pattern = /([A-z]+)\s?([0-9]+)\s?([A-z]+)?/;
  let wasMatched = false;

  // Match each comma-separated term
  for ( let s of original.split(",") ) {
    s = s.trim();
    const match = s.match(pattern);
    if ( !match ) continue;
    const type = match[1].toLowerCase();
    if ( type in CONFIG.DND5E.senses ) {
      updateData[`data.attributes.senses.${type}`] = Number(match[2]).toNearest(0.5);
      wasMatched = true;
    }
  }

  // If nothing was matched, but there was an old string - put the whole thing in "special"
  if ( !wasMatched && !!original ) {
    updateData["data.attributes.senses.special"] = original;
  }

  // Remove the old traits.senses string once the migration is complete
  updateData["data.traits.-=senses"] = null;
  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate the actor details.type string to object
 * @private
 */
function _migrateActorType(actor, updateData) {
  const ad = actor.data;
  const original = ad.details?.type;
  if ( typeof original !== "string" ) return;

  // New default data structure
  let data = {
    "value": "",
    "subtype": "",
    "swarm": "",
    "custom": ""
  }

  // Match the existing string
  const pattern = /^(?:swarm of (?<size>[\w\-]+) )?(?<type>[^(]+?)(?:\((?<subtype>[^)]+)\))?$/i;
  const match = original.trim().match(pattern);
  if ( match ) {

    // Match a known creature type
    const typeLc = match.groups.type.trim().toLowerCase();
    const typeMatch = Object.entries(CONFIG.DND5E.creatureTypes).find(([k, v]) => {
      return (typeLc === k) ||
        (typeLc === game.i18n.localize(v).toLowerCase()) ||
        (typeLc === game.i18n.localize(`${v}Pl`).toLowerCase());
    });
    if (typeMatch) data.value = typeMatch[0];
    else {
      data.value = "custom";
      data.custom = match.groups.type.trim().titleCase();
    }
    data.subtype = match.groups.subtype?.trim().titleCase() || "";

    // Match a swarm
    const isNamedSwarm = actor.name.startsWith(game.i18n.localize("DND5E.CreatureSwarm"));
    if ( match.groups.size || isNamedSwarm ) {
      const sizeLc = match.groups.size ? match.groups.size.trim().toLowerCase() : "tiny";
      const sizeMatch = Object.entries(CONFIG.DND5E.actorSizes).find(([k, v]) => {
        return (sizeLc === k) || (sizeLc === game.i18n.localize(v).toLowerCase());
      });
      data.swarm = sizeMatch ? sizeMatch[0] : "tiny";
    }
    else data.swarm = "";
  }

  // No match found
  else {
    data.value = "custom";
    data.custom = original;
  }

  // Update the actor data
  updateData["data.details.type"] = data;
  return updateData;
}

/* -------------------------------------------- */

/**
 * Delete the old data.attuned boolean
 *
 * @param {object} item        Item data to migrate
 * @param {object} updateData  Existing update to expand upon
 * @return {object}            The updateData to apply
 * @private
 */
function _migrateItemAttunement(item, updateData) {
  if ( item.data?.attuned === undefined ) return updateData;
  updateData["data.attunement"] = CONFIG.DND5E.attunementTypes.NONE;
  updateData["data.-=attuned"] = null;
  return updateData;
}

/* -------------------------------------------- */

/**
 * Replace class spellcasting string to object.
 *
 * @param {object} item        Item data to migrate
 * @param {object} updateData  Existing update to expand upon
 * @return {object}            The updateData to apply
 * @private
 */
function _migrateItemSpellcasting(item, updateData) {
  if ( item.type !== "class" || (foundry.utils.getType(item.data.spellcasting) === "Object") ) return updateData;
  updateData["data.spellcasting"] = {
    progression: item.data.spellcasting,
    ability: ""
  };
  return updateData;
}


/* -------------------------------------------- */

/**
 * A general tool to purge flags from all entities in a Compendium pack.
 * @param {Compendium} pack   The compendium pack to clean
 * @private
 */
export async function purgeFlags(pack) {
  const cleanFlags = (flags) => {
    const flags5e = flags.dnd5e || null;
    return flags5e ? {dnd5e: flags5e} : {};
  };
  await pack.configure({locked: false});
  const content = await pack.getContent();
  for ( let entity of content ) {
    const update = {_id: entity.id, flags: cleanFlags(entity.data.flags)};
    if ( pack.entity === "Actor" ) {
      update.items = entity.data.items.map(i => {
        i.flags = cleanFlags(i.flags);
        return i;
      })
    }
    await pack.updateEntity(update, {recursive: false});
    console.log(`Purged flags from ${entity.name}`);
  }
  await pack.configure({locked: true});
}

/* -------------------------------------------- */


/**
 * Purge the data model of any inner objects which have been flagged as _deprecated.
 * @param {object} data   The data to clean
 * @private
 */
export function removeDeprecatedObjects(data) {
  for ( let [k, v] of Object.entries(data) ) {
    if ( getType(v) === "Object" ) {
      if (v._deprecated === true) {
        console.log(`Deleting deprecated object key ${k}`);
        delete data[k];
      }
      else removeDeprecatedObjects(v);
    }
  }
  return data;
}
