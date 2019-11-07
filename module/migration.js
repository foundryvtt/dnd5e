/**
 * Perform a system migration when called, applying migrations for both Actors and Items
 * @return {Promise}      A Promise which resolves once the migration is completed
 */
export const migrateSystem = async function() {
  console.log(`Applying D&D5E System Migration for version ${game.system.data.version}`);

  // Migrate Actors
  await migrateActors();

  // Migrate Items
  await migrateItems();

  // Set the migration as complete
  game.settings.set("dnd5e", "systemMigrationVersion", game.system.data.version);
};

/* -------------------------------------------- */

/**
 * Migrate all Actor entities
 */
const migrateActors = async function() {

  // Actor Entities
  for ( let a of game.actors.entities ) {
    const updateData = {};

    // Owned Items
    let hasItemUpdates = false;
    const items = a.items.map(i => {
      let itemUpdate = migrateItem(i);
      if ( !isObjectEmpty(itemUpdate) ) hasItemUpdates = true;
      return mergeObject(i.data, itemUpdate, {enforceTypes: false, inplace: false});
    });
    if ( hasItemUpdates ) updateData.items = items;

    // Perform the Update
    if ( !isObjectEmpty(updateData) ) {
      console.log(`Migrating Actor entity ${a.name}`);
      await a.update(updateData, {enforceTypes: false});
    }
  }

  // TODO: Actor Compendia
};


/* -------------------------------------------- */

/**
 * Migrate all Item entities
 */
const migrateItems = async function() {

  // Item Entities
  for ( let i of game.items.entities ) {
    const updateData = migrateItem(i);
    if ( !isObjectEmpty(updateData) ) {
      console.log(`Migrating Item entity ${i.name}`);
      await i.update(updateData, {enforceTypes: false});
    }
  }

  // TODO: Item Compendia
};

/* -------------------------------------------- */

/**
 * Migrate a single Item entity to incorporate latest data model changes
 * @param item
 */
const migrateItem = function(item) {
  const updateData = {};

  // Flatten values
  const toFlatten = ["ability", "attuned", "consumableType", "equipped", "identified", "quantity", "levels", "price",
    "proficient", "rarity", "requirements", "stealth", "strength", "source", "subclass", "weight", "weaponType"];
  _migrateFlattenValues(item, updateData, toFlatten);

  // Migrate all items
  _migrateDamage(item, updateData);

  // Migrate backpack to loot
  if ( item.data.type === "backpack" ) {
    _migrateBackpackLoot(item, updateData);
  }

  // Migrate Spell items
  if (item.data.type === "spell") {
    _migrateSpellTime(item, updateData);
    _migrateDuration(item, updateData);
    _migrateRange(item, updateData);
    _migrateTarget(item, updateData);
    _migrateSpellComponents(item, updateData);
    _migrateSpellSave(item, updateData);
  }

  // Migrate Equipment items
  else if ( item.data.type === "equipment" ) {
    _migrateArmor(item, updateData);
  }

  // Migrate Weapon Items
  else if ( item.data.type === "weapon" ) {
    _migrateWeaponProperties(item, updateData);
  }

  // Remove deprecated fields
  _migrateRemoveDeprecated(item, updateData);

  // Return the migrated update data
  return updateData;
};

/* -------------------------------------------- */

/**
 * Migrate from a "backpack" item subtype to a "loot" item subtype for more coherent naming
 * @private
 */
const _migrateBackpackLoot = function(item, updateData) {
  updateData["type"] = "loot";
  updateData["data.-=deprecationWarning"] = null;
};

/* -------------------------------------------- */

/**
 * Migrate from a string based armor class like "14" and a separate string armorType to a single armor object which
 * tracks both armor value and type.
 * @private
 */
const _migrateArmor = function(item, updateData) {
  const armor = item.data.data.armor;
  if ( armor && item.data.data.armorType ) {
    updateData["data.armor.type"] = item.data.data.armorType.value;
    updateData["data.-=armorType"] = null;
  }
};

/* -------------------------------------------- */

/**
 * Migrate from a string based damage formula like "2d6 + 4 + 1d4" and a single string damage type like "slash" to
 * separated damage parts with associated damage type per part.
 * @private
 */
const _migrateDamage = function(item, updateData) {
  let damage = item.data.data.damage;
  if ( !damage || (damage.parts instanceof Array) || !damage.value ) return;
  const type = item.data.data.damageType ? item.data.data.damageType.value : "";
  const formula = damage.value.replace(/[\-\*\/]/g, "+");
  updateData["data.damage.parts"] = formula.split("+").map(s => s.trim()).map(p => [p, type || null]);
  updateData["data.damage.-=value"] =  null;
  updateData["data.-=damageType"] = null;
};

/* -------------------------------------------- */


/**
 * Flatten several attributes which currently have an unnecessarily nested {value} object
 * @private
 */
const _migrateFlattenValues = function(item, updateData, toFlatten) {
  for ( let a of toFlatten ) {
    if ( item.data.data[a] instanceof Object ) {
      updateData["data."+a] = item.data.data[a].value;
    }
  }
};

/* -------------------------------------------- */

/**
 * Migrate from a string spell casting time like "1 Bonus Action" to separate fields for activation type and numeric cost
 * @private
 */
const _migrateSpellTime = function(item, updateData) {
  const value = getProperty(item.data, "data.time.value");
  if ( !value ) return;
  const ATS = Object.fromEntries(Object.entries(CONFIG.DND5E.abilityActivationTypes).map(e => e.reverse()));
  let match = value.match(/([\d]+\s)?([\w\s]+)/);
  if ( !match ) return;
  let type = ATS[match[2]] || "none";
  let cost = match[1] ? Number(match[1]) : 0;
  if ( type === "none" ) cost = 0;
  updateData["data.activation"] = {type, cost};
  updateData["data.-=time"] = null;
};

/* -------------------------------------------- */

/**
 * Migrate from a string duration field like "1 Minute" to separate fields for duration units and numeric value
 * @private
 */
const _migrateDuration = function(item, updateData) {
  const TIME = Object.fromEntries(Object.entries(CONFIG.DND5E.timePeriods).map(e => e.reverse()));
  const dur = item.data.data.duration;
  if ( dur.value && !dur.units ) {
    let match = dur.value.match(/([\d]+\s)?([\w\s]+)/);
    if ( !match ) return;
    let units = TIME[match[2]] || "inst";
    let value = units === "inst" ? "" : Number(match[1]) || "";
    updateData["data.duration"] = {units, value};
  }
};

/* -------------------------------------------- */

/**
 * Migrate from a string range field like "150 ft." to separate fields for units and numeric distance value
 * @private
 */
const _migrateRange = function(item, updateData) {
  const range = item.data.data.range;
  if ( range.value && !range.units ) {
    let match = range.value.match(/([\d]+\s)?([\w\s]+)/);
    if ( !match ) return;
    let units = "none";
    if ( /ft/i.test(match[2]) ) units = "ft";
    else if ( /mi/i.test(match[2]) ) units = "mi";
    else if ( /touch/i.test(match[2]) ) units = "touch";
    let value = Number(match[1]) || null;
    updateData["data.range"] = {units, value};
  }
};

/* -------------------------------------------- */


/**
 * A general migration to remove all fields from the data model which are flagged with a _deprecated tag
 * @private
 */
const _migrateRemoveDeprecated = function(item, updateData) {
  for ( let [k, v] of Object.entries(item.data.data) ) {
    if ( getType(v) !== "Object" ) continue;

    // Deprecate the entire object
    if ( v._deprecated === true ) {
      updateData[`data.-=${k}`] = null;
      continue;
    }

    // Remove type and label
    const dtypes = ["Number", "String", "Boolean", "Array", "Object"];
    if ( dtypes.includes(v.type) ) updateData[`data.${k}.-=type`] = null;
    if ( v.label ) updateData[`data.${k}.-=label`] = null;
  }
};

/* -------------------------------------------- */

/**
 * Migrate from a target string like "15 ft. Radius" to a more explicit data model with a value, units, and type
 * @private
 */
const _migrateTarget = function(item, updateData) {
  const target = item.data.data.target;
  if ( target.value && !(target.units || target.type) ) {

    // Target Type
    let type = null;
    for ( let t of Object.keys(CONFIG.DND5E.targetTypes) ) {
      let rgx = new RegExp(t, "i");
      if ( rgx.test(target.value) ) {
        type = t;
        continue;
      }
    }

    // Target Units
    let units = null;
    if ( /ft/i.test(target.value) ) units = "ft";
    else if ( /mi/i.test(target.value) ) units = "mi";
    else if ( /touch/i.test(target.value) ) units = "touch";

    // Target Distance
    let value = null;
    let match = target.value.match(/([\d]+)([\w\s]+)?/);
    if ( match ) value = Number(match[1]);
    updateData["data.target"] = {type, units, value};
  }
};

/* -------------------------------------------- */

/**
 * Migrate from string based components like "V,S,M" to boolean flags for each component
 * Move concentration and ritual flags into the components object
 * @private
 */
const _migrateSpellComponents = function(item, updateData) {
  const components = item.data.data.components;
  if ( !components.value ) return;
  let comps = components.value.toUpperCase().replace(/\s/g, "").split(",");
  updateData["data.components"] = {
    value: "",
    vocal: comps.includes("V"),
    somatic: comps.includes("M"),
    material: comps.includes("S"),
    concentration: item.data.data.concentration.value === true,
    ritual: item.data.data.ritual.value === true
  };
  updateData["data.-=concentration"] = null;
  updateData["data.-=ritual"] = null;
};

/* -------------------------------------------- */

/**
 * Migrate from a simple object with save.value to an expanded object where the DC is also configured
 * @private
 */
const _migrateSpellSave = function(item, updateData) {
  const save = item.data.data.save;
  if ( !save.value ) return;
  updateData["data.save"] = {
    ability: save.value,
    dc: null
  }
};

/* -------------------------------------------- */

/**
 * Migrate from a string based weapon properties like "Heavy, Two-Handed" to an object of boolean flags
 * @private
 */
const _migrateWeaponProperties = function(item, updateData) {
  const props = item.data.data.properties;
  if ( !props.value ) return;
  const labels = Object.fromEntries(Object.entries(CONFIG.DND5E.weaponProperties).map(e => e.reverse()));
  for ( let k of props.value.split(",").map(p => p.trim()) ) {
    if ( labels[k] ) updateData[`data.properties.${labels[k]}`] = true;
  }
  updateData["data.properties.-=value"] = null;
};