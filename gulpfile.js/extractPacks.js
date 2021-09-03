const parsedArgs = require('yargs').argv;

const Datastore = require('nedb');
const fs = require("fs");
const gulp = require('gulp');
const mergeStream = require("merge-stream");
const path = require("path");
const through2 = require("through2");

const { cleanPackEntry } = require("./cleanPacks.js");
const { PACK_DEST, PACK_SRC } = require("./paths.js");


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


module.exports = { extractPacks };
