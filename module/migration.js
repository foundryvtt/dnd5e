
export const migrateSystem = async function() {
  console.log(`Applying D&D5E System Migration for version ${game.system.data.version}`);

  // Migrate Items
  await migrateItems();

  // Set the migration as complete
  game.settings.set("dnd5e", "systemMigrationVersion", game.system.data.version);
};

/* -------------------------------------------- */

const migrateItems = async function() {

  // Item Entities
  for ( let i of game.items.entities ) {
    const updateData = migrateItem(i);
    if ( !isObjectEmpty(updateData) ) {
      console.log(`Updating Item entity ${i.name}`);
      await i.update(updateData);
    }
  }

  // Item Compendia
  const packs = game.packs.filter(p => p.entity === "Item");
  for ( let p of packs ) {
    const content = await p.getContent();
    for ( let i of content ) {
      const updateData = migrateItem(i);
      if ( !isObjectEmpty(updateData) ) {
        //console.log(`Updating Compendium entry ${i.name}`);
        //await p.updateEntity(mergeObject(updateData, {_id: i._id}));
      }
    }
  }
};

/* -------------------------------------------- */

const migrateItem = function(item) {
  const updateData = {};

  // Migrate Spell items
  if (item.data.type === "spell") {
    _migrateSpellTime(item, updateData);
    _migrateDuration(item, updateData);
    _migrateRange(item, updateData);
    _migrateTarget(item, updateData);
  }

  // Return the migrated update data
  return updateData;
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
  updateData["data.time.value"] = null;
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

const _migrateTarget = function(item, updateData) {
  const target = item.data.data.target;
  if ( target.value && !target.units ) {

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
