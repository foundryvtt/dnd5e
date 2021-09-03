const parsedArgs = require('yargs').argv;

const fs = require("fs");
const gulp = require('gulp');
const mergeStream = require("merge-stream");
const path = require("path");
const through2 = require("through2");

const { PACK_SRC } = require("./paths.js");


/**
 * Removes unwanted flags, permissions, and other data from entries before extracting or compiling.
 * @param {object} data  Data for a single entry to clean.
 * @param {object} [options]
 * @param {boolean} [clearSourceId]  Should the core sourceId flag be deleted.
 */
function cleanPackEntry(data, { clearSourceId=true }={}) {
  if ( data.permission ) data.permission = { "default": 0 };
  if ( clearSourceId ) delete data.flags?.core?.sourceId;
  delete data.flags?.importSource;
  delete data.flags?.exportSource;

  // Remove empty entries in flags
  if ( !data.flags ) data.flags = {};
  Object.entries(data.flags).forEach(([key, contents]) => {
    if ( Object.keys(contents).length === 0 ) delete data.flags[key];
  });

  if ( data.effects ) data.effects.forEach((i) => cleanPackEntry(i, { clearSourceId: false }));
  if ( data.items ) data.items.forEach((i) => cleanPackEntry(i, { clearSourceId: false }));
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
  const folders = fs.readdirSync(PACK_SRC, { withFileTypes: true }).filter((file) =>
    file.isDirectory() && ( !packName || (packName === file.name) )
  );

  const packs = folders.map((folder) => {
    return gulp.src(path.join(PACK_SRC, folder.name, "/**/*.json"))
      .pipe(through2.obj((file, enc, callback) => {
        const json = JSON.parse(file.contents.toString());
        const name = json.name.toLowerCase();
        if ( entryName && (entryName !== name) ) return callback(null, file);
        cleanPackEntry(json);
        fs.rmSync(file.path, { force: true });
        fs.writeFileSync(file.path, JSON.stringify(json, null, 2) + "\n", { mode: 0o664 });
        callback(null, file);
      }));
  });

  return mergeStream.call(null, packs);
}


module.exports = { cleanPackEntry, cleanPacks };
