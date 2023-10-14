import Datastore from "nedb-promises";
import fs from "fs";
import gulp from "gulp";
import logger from "fancy-log";
import mergeStream from "merge-stream";
import path from "path";
import through2 from "through2";
import yargs from "yargs";
import { compilePack, extractPack } from "@foundryvtt/foundryvtt-cli";


/**
 * Parsed arguments passed in through the command line.
 * @type {object}
 */
const parsedArgs = yargs(process.argv).argv;

/**
 * Folder where the compiled compendium packs should be located relative to the
 * base 5e system folder.
 * @type {string}
 */
const PACK_DEST = "packs";

/**
 * Folder where source JSON files should be located relative to the 5e system folder.
 * @type {string}
 */
const PACK_SRC = "packs/src";

/**
 * Cache of DBs so they aren't loaded repeatedly when determining IDs.
 * @type {Object<string,Datastore>}
 */
const DB_CACHE = {};


/* ----------------------------------------- */
/*  Clean Packs
/* ----------------------------------------- */

/**
 * Removes unwanted flags, permissions, and other data from entries before extracting or compiling.
 * @param {object} data  Data for a single entry to clean.
 * @param {object} [options]
 * @param {boolean} [options.clearSourceId]  Should the core sourceId flag be deleted.
 */
function cleanPackEntry(data, { clearSourceId=true }={}) {
  if ( data.ownership ) data.ownership = { default: 0 };
  if ( clearSourceId ) delete data.flags?.core?.sourceId;
  if ( typeof data.folder === "string" ) data.folder = null;
  delete data.flags?.importSource;
  delete data.flags?.exportSource;
  if ( data._stats?.lastModifiedBy ) data._stats.lastModifiedBy = "dnd5ebuilder0000";

  // Remove empty entries in flags
  if ( !data.flags ) data.flags = {};
  Object.entries(data.flags).forEach(([key, contents]) => {
    if ( Object.keys(contents).length === 0 ) delete data.flags[key];
  });

  if ( data.system?.activation?.cost === 0 ) data.system.activation.cost = null;
  if ( data.system?.duration?.value === "0" ) data.system.duration.value = "";
  if ( data.system?.target?.value === 0 ) data.system.target.value = null;
  if ( data.system?.target?.width === 0 ) data.system.target.width = null;
  if ( data.system?.range?.value === 0 ) data.system.range.value = null;
  if ( data.system?.range?.long === 0 ) data.system.range.long = null;
  if ( data.system?.uses?.value === 0 ) data.system.uses.value = null;
  if ( data.system?.uses?.max === "0" ) data.system.duration.value = "";
  if ( data.system?.save?.dc === 0 ) data.system.save.dc = null;
  if ( data.system?.capacity?.value === 0 ) data.system.capacity.value = null;
  if ( data.system?.strength === 0 ) data.system.strength = null;

  // Remove mystery-man.svg from Actors
  if ( ["character", "npc"].includes(data.type) && data.img === "icons/svg/mystery-man.svg" ) {
    data.img = "";
    data.prototypeToken.texture.src = "";
  }

  if ( data.effects ) data.effects.forEach(i => cleanPackEntry(i, { clearSourceId: false }));
  if ( data.items ) data.items.forEach(i => cleanPackEntry(i, { clearSourceId: false }));
  if ( data.system?.description?.value ) data.system.description.value = cleanString(data.system.description.value);
  if ( data.label ) data.label = cleanString(data.label);
  if ( data.name ) data.name = cleanString(data.name);
  data.sort = 0;
}


/**
 * Attempts to find an existing matching ID for an item of this name, otherwise generates a new unique ID.
 * @param {object} data        Data for the entry that needs an ID.
 * @param {string} pack        Name of the pack to which this item belongs.
 * @returns {Promise<string>}  Resolves once the ID is determined.
 */
async function determineId(data, pack) {
  const db_path = path.join(PACK_DEST, `${pack}.db`);
  if ( !DB_CACHE[db_path] ) DB_CACHE[db_path] = Datastore.create({ filename: db_path, autoload: true });
  const db = DB_CACHE[db_path];

  try {
    return await db.findOne({ name: data.name });
  } catch ( err ) {
    return db.createNewId();
  }
}

/**
 * Removes invisible whitespace characters and normalises single- and double-quotes.
 * @param {string} str  The string to be cleaned.
 * @returns {string}    The cleaned string.
 */
function cleanString(str) {
  return str.replace(/\u2060/gu, "").replace(/[‘’]/gu, "'").replace(/[“”]/gu, '"');
}

/**
 * Cleans and formats source JSON files, removing unnecessary permissions and flags
 * and adding the proper spacing.
 *
 * - `gulp cleanPacks` - Clean all source JSON files.
 * - `gulp cleanPacks --pack classes` - Only clean the source files for the specified compendium.
 * - `gulp cleanPacks --pack classes --name Barbarian` - Only clean a single item from the specified compendium.
 */
function cleanPacks() {
  const packName = parsedArgs.pack;
  const entryName = parsedArgs.name?.toLowerCase();
  const folders = fs.readdirSync(PACK_SRC, { withFileTypes: true }).filter(file =>
    file.isDirectory() && ( !packName || (packName === file.name) )
  );

  const packs = folders.map(folder => {
    logger.info(`Cleaning pack ${folder.name}`);
    return gulp.src(path.join(PACK_SRC, folder.name, "/**/*.json"))
      .pipe(through2.obj(async (file, enc, callback) => {
        const json = JSON.parse(file.contents.toString());
        const name = json.name.toLowerCase();
        if ( entryName && (entryName !== name) ) return callback(null, file);
        cleanPackEntry(json);
        if ( !json._id ) json._id = await determineId(json, folder.name);
        fs.rmSync(file.path, { force: true });
        fs.writeFileSync(file.path, `${JSON.stringify(json, null, 2)}\n`, { mode: 0o664 });
        callback(null, file);
      }));
  });

  return mergeStream(packs);
}
export const clean = cleanPacks;


/* ----------------------------------------- */
/*  Compile Packs
/* ----------------------------------------- */

/**
 * Compile the source JSON files into compendium packs.
 *
 * - `gulp compilePacks` - Compile all JSON files into their NEDB files.
 * - `gulp compilePacks --pack classes` - Only compile the specified pack.
 */
async function compilePacks() {
  const packName = parsedArgs.pack;
  // Determine which source folders to process
  const folders = fs.readdirSync(PACK_SRC, { withFileTypes: true }).filter(file =>
    file.isDirectory() && ( !packName || (packName === file.name) )
  );

  for ( const folder of folders ) {
    const src = path.join(PACK_SRC, folder.name);
    const dest = path.join(PACK_DEST, `${folder.name}.db`);
    logger.info(`Compiling pack ${folder.name}`);
    await compilePack(src, dest, { nedb: true, recursive: true, log: true, transformEntry: cleanPackEntry });
  }
}
export const compile = compilePacks;


/* ----------------------------------------- */
/*  Extract Packs
/* ----------------------------------------- */

/**
 * Extract the contents of compendium packs to JSON files.
 *
 * - `gulp extractPacks` - Extract all compendium NEDB files into JSON files.
 * - `gulp extractPacks --pack classes` - Only extract the contents of the specified compendium.
 * - `gulp extractPacks --pack classes --name Barbarian` - Only extract a single item from the specified compendium.
 */
async function extractPacks() {
  const packName = parsedArgs.pack;
  const entryName = parsedArgs.name?.toLowerCase();

  // Load system.json.
  const system = JSON.parse(fs.readFileSync("./system.json", { encoding: "utf8" }));

  // Determine which source packs to process.
  const packs = fs.readdirSync(PACK_DEST, { withFileTypes: true }).filter(file => {
    if ( !file.isFile() || (path.extname(file.name) !== ".db") ) return false;
    return !packName || (packName === path.basename(file.name, ".db"));
  });

  for ( const pack of packs ) {
    const packName = path.basename(pack.name, ".db");
    const packInfo = system.packs.find(p => p.name === packName);
    const src = path.join(PACK_DEST, pack.name);
    const dest = path.join(PACK_SRC, packName);
    logger.info(`Extracting pack ${pack.name}`);
    await extractPack(src, dest, { nedb: true, log: true, documentType: packInfo.type, transformEntry: entry => {
      if ( entryName && (entryName !== entry.name.toLowerCase()) ) return false;
      cleanPackEntry(entry);
    }, transformName: entry => {
      const name = entry.name.toLowerCase();
      const outputName = name.replace("'", "").replace(/[^a-z0-9]+/gi, " ").trim().replace(/\s+|-{2,}/g, "-");
      const subfolder = _getSubfolderName(entry, packName);
      return path.join(subfolder, `${outputName}.json`);
    } });
  }
}
export const extract = extractPacks;


/**
 * Determine a subfolder name based on which pack is being extracted.
 * @param {object} data  Data for the entry being extracted.
 * @param {string} pack  Name of the pack.
 * @returns {string}     Subfolder name the entry into which the entry should be created. An empty string if none.
 * @private
 */
function _getSubfolderName(data, pack) {
  switch (pack) {
    // Items should be grouped by type
    case "items":
      if ( (data.type === "consumable") && data.system.consumableType ) return data.system.consumableType;
      return data.type;

    // Monsters should be grouped by type
    case "monsters":
      if ( !data.system?.details?.type?.value ) return "";
      return data.system.details.type.value;

    // Spells should be grouped by level
    case "spells":
      if ( data.system?.level === undefined ) return "";
      if ( data.system.level === 0 ) return "cantrip";
      return `level-${data.system.level}`;

    default: return "";
  }
}
