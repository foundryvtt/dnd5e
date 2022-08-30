/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @returns {Promise}      A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function() {
  const version = game.system.version;
  ui.notifications.info(game.i18n.format("MIGRATION.5eBegin", {version}), {permanent: true});

  const migrationData = await getMigrationData();

  // Migrate World Actors
  for ( let a of game.actors ) {
    try {
      const updateData = migrateActorData(a.toObject(), migrationData);
      if ( !foundry.utils.isEmpty(updateData) ) {
        console.log(`Migrating Actor document ${a.name}`);
        await a.update(updateData, {enforceTypes: false});
      }
    } catch(err) {
      err.message = `Failed dnd5e system migration for Actor ${a.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Items
  for ( let i of game.items ) {
    try {
      const updateData = migrateItemData(i.toObject(), migrationData);
      if ( !foundry.utils.isEmpty(updateData) ) {
        console.log(`Migrating Item document ${i.name}`);
        await i.update(updateData, {enforceTypes: false});
      }
    } catch(err) {
      err.message = `Failed dnd5e system migration for Item ${i.name}: ${err.message}`;
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

  // Migrate Actor Override Tokens
  for ( let s of game.scenes ) {
    try {
      const updateData = migrateSceneData(s, migrationData);
      if ( !foundry.utils.isEmpty(updateData) ) {
        console.log(`Migrating Scene document ${s.name}`);
        await s.update(updateData, {enforceTypes: false});
        // If we do not do this, then synthetic token actors remain in cache
        // with the un-updated actorData.
        s.tokens.forEach(t => t._actor = null);
      }
    } catch(err) {
      err.message = `Failed dnd5e system migration for Scene ${s.name}: ${err.message}`;
      console.error(err);
    }
  }

  // Migrate World Compendium Packs
  for ( let p of game.packs ) {
    if ( p.metadata.package !== "world" ) continue;
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
      switch (documentName) {
        case "Actor":
          updateData = migrateActorData(doc.toObject(), migrationData);
          break;
        case "Item":
          updateData = migrateItemData(doc.toObject(), migrationData);
          break;
        case "Scene":
          updateData = migrateSceneData(doc.toObject(), migrationData);
          break;
      }

      // Save the entry, if data was changed
      if ( foundry.utils.isEmpty(updateData) ) continue;
      await doc.update(updateData);
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
 * @returns {object}                The updateData to apply
 */
export const migrateActorData = function(actor, migrationData) {
  const updateData = {};
  _migrateTokenImage(actor, updateData);

  // Actor Data Updates
  _migrateActorMovement(actor, updateData);
  _migrateActorSenses(actor, updateData);
  _migrateActorType(actor, updateData);
  _migrateActorAC(actor, updateData);

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
    let itemUpdate = migrateItemData(itemData, migrationData);

    // Prepared, Equipped, and Proficient for NPC actors
    if ( actor.type === "npc" ) {
      if (foundry.utils.getProperty(itemData.system, "preparation.prepared") === false) itemUpdate["system.preparation.prepared"] = true;
      if (foundry.utils.getProperty(itemData.system, "equipped") === false) itemUpdate["system.equipped"] = true;
      if (foundry.utils.getProperty(itemData.system, "proficient") === false) itemUpdate["system.proficient"] = true;
    }

    // Update the Owned Item
    if ( !foundry.utils.isEmpty(itemUpdate) ) {
      itemUpdate._id = itemData._id;
      arr.push(foundry.utils.expandObject(itemUpdate));
    }

    return arr;
  }, []);
  if ( items.length > 0 ) updateData.items = items;

  return updateData;
};

/* -------------------------------------------- */

/**
 * Scrub an Actor's system data, removing all keys which are not explicitly defined in the system template
 * @param {object} actorData    The data object for an Actor
 * @returns {object}            The scrubbed Actor data
 */
function cleanActorData(actorData) {

  // Scrub system data
  const model = game.system.model.Actor[actorData.type];
  actorData.system = foundry.utils.filterObject(actorData.system, model);

  // Scrub system flags
  const allowedFlags = CONFIG.DND5E.allowedActorFlags.reduce((obj, f) => {
    obj[f] = null;
    return obj;
  }, {});
  if ( actorData.flags.dnd5e ) {
    actorData.flags.dnd5e = foundry.utils.filterObject(actorData.flags.dnd5e, allowedFlags);
  }

  // Return the scrubbed data
  return actorData;
}


/* -------------------------------------------- */

/**
 * Migrate a single Item document to incorporate latest data model changes
 *
 * @param {object} item             Item data to migrate
 * @param {object} [migrationData]  Additional data to perform the migration
 * @returns {object}                The updateData to apply
 */
export const migrateItemData = function(item, migrationData) {
  const updateData = {};
  _migrateItemAttunement(item, updateData);
  _migrateItemRarity(item, updateData);
  _migrateItemSpellcasting(item, updateData);
  _migrateArmorType(item, updateData);
  _migrateItemCriticalData(item, updateData);
  _migrateDocumentIcon(item, updateData, migrationData);

  // Migrate embedded effects
  if ( item.effects ) {
    const effects = migrateEffects(item, migrationData);
    if ( effects.length > 0 ) updateData.effects = effects;
  }

  return updateData;
};

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
 * Migrate a single Scene document to incorporate changes to the data model of it's actor data overrides
 * Return an Object of updateData to be applied
 * @param {object} scene            The Scene data to Update
 * @param {object} [migrationData]  Additional data to perform the migration
 * @returns {object}                The updateData to apply
 */
export const migrateSceneData = function(scene, migrationData) {
  const tokens = scene.tokens.map(token => {
    const t = token.toObject();
    const update = {};
    _migrateTokenImage(t, update);
    if ( Object.keys(update).length ) foundry.utils.mergeObject(t, update);
    if ( !t.actorId || t.actorLink ) {
      t.actorData = {};
    }
    else if ( !game.actors.has(t.actorId) ) {
      t.actorId = null;
      t.actorData = {};
    }
    else if ( !t.actorLink ) {
      const actorData = duplicate(t.actorData);
      actorData.type = token.actor?.type;
      const update = migrateActorData(actorData, migrationData);
      ["items", "effects"].forEach(embeddedName => {
        if (!update[embeddedName]?.length) return;
        const updates = new Map(update[embeddedName].map(u => [u._id, u]));
        t.actorData[embeddedName].forEach(original => {
          const update = updates.get(original._id);
          if (update) foundry.utils.mergeObject(original, update);
        });
        delete update[embeddedName];
      });

      foundry.utils.mergeObject(t.actorData, update);
    }
    return t;
  });
  return {tokens};
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
 * Migrate the actor speed string to movement object
 * @param {object} actorData   Actor data being migrated.
 * @param {object} updateData  Existing updates being applied to actor. *Will be mutated.*
 * @returns {object}           Modified version of update data.
 * @private
 */
function _migrateActorMovement(actorData, updateData) {
  const attrs = actorData.system.attributes || {};

  // Work is needed if old data is present
  const old = actorData.type === "vehicle" ? attrs.speed : attrs.speed?.value;
  const hasOld = old !== undefined;
  if ( hasOld ) {

    // If new data is not present, migrate the old data
    const hasNew = attrs.movement?.walk !== undefined;
    if ( !hasNew && (typeof old === "string") ) {
      const s = (old || "").split(" ");
      if ( s.length > 0 ) updateData["system.attributes.movement.walk"] = Number.isNumeric(s[0]) ? parseInt(s[0]) : null;
    }

    // Remove the old attribute
    updateData["system.attributes.-=speed"] = null;
  }
  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate the actor traits.senses string to attributes.senses object
 * @param {object} actor       Actor data being migrated.
 * @param {object} updateData  Existing updates being applied to actor. *Will be mutated.*
 * @returns {object}           Modified version of update data.
 * @private
 */
function _migrateActorSenses(actor, updateData) {
  const oldSenses = actor.system.traits?.senses;
  if ( oldSenses === undefined ) return;
  if ( typeof oldSenses !== "string" ) return;

  // Try to match old senses with the format like "Darkvision 60 ft, Blindsight 30 ft"
  const pattern = /([A-z]+)\s?([0-9]+)\s?([A-z]+)?/;
  let wasMatched = false;

  // Match each comma-separated term
  for ( let s of oldSenses.split(",") ) {
    s = s.trim();
    const match = s.match(pattern);
    if ( !match ) continue;
    const type = match[1].toLowerCase();
    if ( type in CONFIG.DND5E.senses ) {
      updateData[`system.attributes.senses.${type}`] = Number(match[2]).toNearest(0.5);
      wasMatched = true;
    }
  }

  // If nothing was matched, but there was an old string - put the whole thing in "special"
  if ( !wasMatched && oldSenses ) {
    updateData["system.attributes.senses.special"] = oldSenses;
  }

  // Remove the old traits.senses string once the migration is complete
  updateData["system.traits.-=senses"] = null;
  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate the actor details.type string to object
 * @param {object} actor       Actor data being migrated.
 * @param {object} updateData  Existing updates being applied to actor. *Will be mutated.*
 * @returns {object}           Modified version of update data.
 * @private
 */
function _migrateActorType(actor, updateData) {
  const original = actor.system.details?.type;
  if ( typeof original !== "string" ) return;

  // New default data structure
  let actorTypeData = {
    value: "",
    subtype: "",
    swarm: "",
    custom: ""
  };

  // Match the existing string
  const pattern = /^(?:swarm of (?<size>[\w-]+) )?(?<type>[^(]+?)(?:\((?<subtype>[^)]+)\))?$/i;
  const match = original.trim().match(pattern);
  if ( match ) {

    // Match a known creature type
    const typeLc = match.groups.type.trim().toLowerCase();
    const typeMatch = Object.entries(CONFIG.DND5E.creatureTypes).find(([k, v]) => {
      return (typeLc === k)
        || (typeLc === game.i18n.localize(v).toLowerCase())
        || (typeLc === game.i18n.localize(`${v}Pl`).toLowerCase());
    });
    if (typeMatch) actorTypeData.value = typeMatch[0];
    else {
      actorTypeData.value = "custom";
      actorTypeData.custom = match.groups.type.trim().titleCase();
    }
    actorTypeData.subtype = match.groups.subtype?.trim().titleCase() || "";

    // Match a swarm
    const isNamedSwarm = actor.name.startsWith(game.i18n.localize("DND5E.CreatureSwarm"));
    if ( match.groups.size || isNamedSwarm ) {
      const sizeLc = match.groups.size ? match.groups.size.trim().toLowerCase() : "tiny";
      const sizeMatch = Object.entries(CONFIG.DND5E.actorSizes).find(([k, v]) => {
        return (sizeLc === k) || (sizeLc === game.i18n.localize(v).toLowerCase());
      });
      actorTypeData.swarm = sizeMatch ? sizeMatch[0] : "tiny";
    }
    else actorTypeData.swarm = "";
  }

  // No match found
  else {
    actorTypeData.value = "custom";
    actorTypeData.custom = original;
  }

  // Update the actor data
  updateData["system.details.type"] = actorTypeData;
  return updateData;
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
 * Delete the old data.attuned boolean.
 * @param {object} item        Item data to migrate
 * @param {object} updateData  Existing update to expand upon
 * @returns {object}           The updateData to apply
 * @private
 */
function _migrateItemAttunement(item, updateData) {
  if ( item.system?.attuned === undefined ) return updateData;
  updateData["system.attunement"] = CONFIG.DND5E.attunementTypes.NONE;
  updateData["system.-=attuned"] = null;
  return updateData;
}

/* -------------------------------------------- */

/**
 * Attempt to migrate item rarity from freeform string to enum value.
 * @param {object} item        Item data to migrate.
 * @param {object} updateData  Existing update to expand upon.
 * @returns {object}           The updateData to apply.
 * @private
 */
function _migrateItemRarity(item, updateData) {
  if ( item.system?.rarity === undefined ) return updateData;
  const rarity = Object.keys(CONFIG.DND5E.itemRarity).find(key =>
    (CONFIG.DND5E.itemRarity[key].toLowerCase() === item.system.rarity.toLowerCase()) || (key === item.system.rarity)
  );
  updateData["system.rarity"] = rarity ?? "";
  return updateData;
}

/* -------------------------------------------- */

/**
 * Replace class spellcasting string to object.
 * @param {object} item        Item data to migrate.
 * @param {object} updateData  Existing update to expand upon.
 * @returns {object}           The updateData to apply.
 * @private
 */
function _migrateItemSpellcasting(item, updateData) {
  if ( item.type !== "class" || (foundry.utils.getType(item.system.spellcasting) === "Object") ) return updateData;
  updateData["system.spellcasting"] = {
    progression: item.system.spellcasting,
    ability: ""
  };
  return updateData;
}

/* --------------------------------------------- */

/**
 * Convert equipment items of type 'bonus' to 'trinket'.
 * @param {object} item        Item data to migrate.
 * @param {object} updateData  Existing update to expand upon.
 * @returns {object}           The updateData to apply.
 * @private
 */
function _migrateArmorType(item, updateData) {
  if ( item.type !== "equipment" ) return updateData;
  if ( item.system?.armor?.type === "bonus" ) updateData["system.armor.type"] = "trinket";
  return updateData;
}

/* -------------------------------------------- */

/**
 * Set the item's `critical` property to a proper object value.
 * @param {object} item        Item data to migrate.
 * @param {object} updateData  Existing update to expand upon.
 * @returns {object}           The updateData to apply.
 * @private
 */
function _migrateItemCriticalData(item, updateData) {
  const hasCritData = game.system.template.Item[item.type]?.templates?.includes("action");
  if ( !hasCritData || (foundry.utils.getType(item.system.critical) === "Object") ) return updateData;
  updateData["system.critical"] = {
    threshold: null,
    damage: null
  };
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
  const rename = iconMap?.[document?.[field]];
  if ( rename ) updateData[field] = rename;
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
  const changes = effect.changes.map(c => {
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

/* -------------------------------------------- */


/**
 * Purge the data model of any inner objects which have been flagged as _deprecated.
 * @param {object} data   The data to clean.
 * @returns {object}      Cleaned data.
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
