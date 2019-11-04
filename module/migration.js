
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

const migrateItems = async function() {

  // Item Entities
  for ( let i of game.items.entities ) {
    const updateData = migrateItem(i);
    if ( !isObjectEmpty(updateData) ) {
      console.log(`Migrating Item entity ${i.name}`);
      await i.update(updateData, {enforceTypes: false});
    }
  }

  // Item Compendia
  // const packs = game.packs.filter(p => p.entity === "Item");
  // for ( let p of packs ) {
  //   const content = await p.getContent();
  //   for ( let i of content ) {
  //     const updateData = migrateItem(i);
  //     if ( !isObjectEmpty(updateData) ) {
  //       console.log(`Updating Compendium entry ${i.name}`);
  //       await p.updateEntity(mergeObject(updateData, {_id: i._id}));
  //     }
  //   }
  // }
};

/* -------------------------------------------- */

const migrateItem = function(item) {
  const updateData = {};

  // Migrate all items
  _migrateAbility(item, updateData);
  _migrateDamage(item, updateData);

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

  // Remove deprecated fields
  _migrateRemoveDeprecated(item, updateData);

  // Return the migrated update data
  return updateData;
};

/* -------------------------------------------- */

const _migrateAbility = function(item, updateData) {
  const ability = item.data.data.ability;
  if ( ability && (ability.value !== undefined) ) {
    updateData["data.ability"] = item.data.data.ability.value;
  }
};

/* -------------------------------------------- */

const _migrateArmor = function(item, updateData) {
  const armor = item.data.data.armor;
  if ( armor && item.data.data.armorType ) {
    updateData["data.armor.type"] = item.data.data.armorType.value;
    updateData["data.-=armorType"] = null;
  }
};

/* -------------------------------------------- */

const _migrateDamage = function(item, updateData) {
  let damage = item.data.data.damage;
  if ( (damage instanceof Array) || !damage ) return;
  const type = item.data.data.damageType.value;
  const formula = damage.value.replace(/[\-\*\/]/g, "+");
  updateData["data.damage"] = formula.split("+").map(s => s.trim()).map(p => [p, type || null]);
  updateData["data.-=damageType"] = null;
};

/* -------------------------------------------- */

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

const _migrateSpellSave = function(item, updateData) {
  const save = item.data.data.save;
  if ( !save.value ) return;
  updateData["data.save"] = {
    ability: save.value,
    value: ""
  }
};
