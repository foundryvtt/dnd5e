const gulp = require('gulp');
const less = require('gulp-less');

const parsedArgs = require('minimist')(process.argv.slice(2));

// Package Building
const Datastore = require('nedb');
const fs = require("fs");
const mergeStream = require("merge-stream");
const path = require("path");
const through2 = require("through2");
const yaml = require('js-yaml');


/* ----------------------------------------- */
/*  Compile LESS
/* ----------------------------------------- */

const DND5E_LESS = ["less/*.less"];
function compileLESS() {
  return gulp.src("less/dnd5e.less")
    .pipe(less())
    .pipe(gulp.dest("./"))
}
const css = gulp.series(compileLESS);


/* ----------------------------------------- */
/*  Compile Packs
/* ----------------------------------------- */

const PACK_SRC = "packs/src";
const PACK_DEST = "packs";
function compilePacks() {
  const packName = parsedArgs["pack"];
  // Determine which source folders to process
  const folders = fs.readdirSync(PACK_SRC).filter((file) => {
    if ( packName && packName !== file ) return;
    return fs.statSync(path.join(PACK_SRC, file)).isDirectory();
  });

  // Combine the YML files in each folder into a compendium pack
  const packs = folders.map((folder) => {
    const db = new Datastore({
      filename: path.resolve(__dirname, PACK_DEST, `${folder}.db`),
      autoload: true
    });
    return gulp.src(path.join(PACK_SRC, folder, "/**/*.yml")).pipe(
      through2.obj((file, enc, cb) => {
        let json = yaml.loadAll(file.contents.toString());
        db.insert(json);
        cb(null, file);
      })
    );
  });
  return mergeStream.call(null, packs);
}


/* ----------------------------------------- */
/*  Extract Packs
/* ----------------------------------------- */

function extractPacks() {
  const packName = parsedArgs.hasOwnProperty("pack") ? parsedArgs["pack"] : "*"
  const packs = gulp.src(`${PACK_DEST}/**/${packName}.db`)
    .pipe(through2.obj((file, enc, callback) => {
      let filename = path.parse(file.path).name;
      if (!fs.existsSync(`./${PACK_SRC}/${filename}`)) {
        fs.mkdirSync(`./${PACK_SRC}/${filename}`);
      }

      const db = new Datastore({ filename: file.path, autoload: true });
      db.loadDatabase();

      db.find({}, (err, packs) => {
        packs.forEach(pack => {
          let output = yaml.dump(pack, {
            noRefs: true,
            sortKeys: false
          });
          let packName = pack.name.toLowerCase().replace(/[^a-z0-9]+/gi, " ").trim().replace(/\s+|-{2,}/g, "-");
          fs.writeFileSync(`./${PACK_SRC}/${filename}/${packName}.yml`, output);
        });
      });

      callback(null, file);
    }));

  return mergeStream.call(null, packs);
}

/* ----------------------------------------- */
/*  Watch Updates
/* ----------------------------------------- */

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
exports.compilePacks = gulp.series(compilePacks);
exports.extractPacks = gulp.series(extractPacks);
