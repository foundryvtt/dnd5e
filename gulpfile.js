const gulp = require('gulp');
const less = require('gulp-less');

const parsedArgs = require('yargs').argv;

// Package Building
const Datastore = require('nedb');
const fs = require("fs");
const mergeStream = require("merge-stream");
const path = require("path");
const through2 = require("through2");


/* ----------------------------------------- */
/*  Compile LESS
/* ----------------------------------------- */

const DND5E_LESS = ["less/*.less"];

/**
 * Compile the LESS sources into a single CSS file.
 */
function compileLESS() {
  return gulp.src("less/dnd5e.less")
    .pipe(less())
    .pipe(gulp.dest("./"))
}
const css = gulp.series(compileLESS);


/* ----------------------------------------- */
/*  Clean Packs
/* ----------------------------------------- */

/**
 * Removes unwanted flags, permissions, and other data from entries before extracting or compiling.
 * @param {object} data  Data for a single entry to clean.
 * @param {object} [options]
 * @param {boolean} [cleanSourceId]  Should the core sourceId flag be deleted.
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


/* ----------------------------------------- */
/*  Compile Packs
/* ----------------------------------------- */

const PACK_SRC = "packs/src";
const PACK_DEST = "packs";

/**
 * Compile the source JSON files into compendium packs.
 *
 * - `gulp compilePacks` - Compile all JSON files into their NEDB files.
 * - `gulp compilePacks --pack classes` - Only compile the specified pack.
 */
function compilePacks() {
  const packName = parsedArgs.pack;
  // Determine which source folders to process
  const folders = fs.readdirSync(PACK_SRC, { withFileTypes: true }).filter((file) =>
    file.isDirectory() && ( !packName || (packName === file.name) )
  );

  const packs = folders.map((folder) => {
    const filePath = path.join(PACK_DEST, `${folder.name}.db`);
    fs.rmSync(filePath, { force: true });
    const db = fs.createWriteStream(filePath, { flags: "a", mode: 0o664 });
    return gulp.src(path.join(PACK_SRC, folder.name, "/**/*.json"))
      .pipe(through2.obj((file, enc, callback) => {
        const json = JSON.parse(file.contents.toString());
        cleanPackEntry(json);
        db.write(JSON.stringify(json) + "\n");
        callback(null, file);
      }));
  });
  return mergeStream.call(null, packs);
}


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
function extractPacks() {
  const packName = parsedArgs.pack ?? "*";
  const entryName = parsedArgs.name?.toLowerCase();
  const packs = gulp.src(`${PACK_DEST}/**/${packName}.db`)
    .pipe(through2.obj((file, enc, callback) => {
      const filename = path.parse(file.path).name;
      const folder = path.join(PACK_SRC, filename);
      if ( !fs.existsSync(folder) ) fs.mkdirSync(folder, { recursive: true, mode: 0o775 });

      const db = new Datastore({ filename: file.path, autoload: true });
      db.loadDatabase();

      db.find({}, (err, entries) => {
        entries.forEach(entry => {
          const name = entry.name.toLowerCase();
          if ( entryName && (entryName !== name) ) return;
          cleanPackEntry(entry);
          const output = JSON.stringify(entry, null, 2) + "\n";
          const outputName = name.replace(/[^a-z0-9]+/gi, " ").trim().replace(/\s+|-{2,}/g, "-");
          fs.writeFileSync(path.join(folder, `${outputName}.json`), output, { mode: 0o664 });
        });
      });

      callback(null, file);
    }));

  return mergeStream.call(null, packs);
}

/* ----------------------------------------- */
/*  Watch Updates
/* ----------------------------------------- */

/**
 * Update the CSS if any of the LESS sources are modified.
 */
function watchUpdates() {
  gulp.watch(DND5E_LESS, css);
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = gulp.series(
  gulp.parallel(css),
  watchUpdates
);
exports.css = css;
exports.cleanPacks = gulp.series(cleanPacks);
exports.compilePacks = gulp.series(compilePacks);
exports.extractPacks = gulp.series(extractPacks);
