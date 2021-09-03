const parsedArgs = require('yargs').argv;

const fs = require("fs");
const gulp = require('gulp');
const mergeStream = require("merge-stream");
const path = require("path");
const through2 = require("through2");

const { cleanPackEntry } = require("./cleanPacks.js");
const { PACK_DEST, PACK_SRC } = require("./paths.js");


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


module.exports = { compilePacks };
