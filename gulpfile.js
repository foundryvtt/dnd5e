const gulp = require('gulp');
const gulpIf = require('gulp-if');

const css = require('./utils/css.js');
const packs = require('./utils/packs.js');

const parsedArgs = require('minimist')(process.argv.slice(2));

// Code Linting
const eslint = require('gulp-eslint');
const mergeStream = require("merge-stream");
require('babel-eslint');
require('eslint-plugin-jsdoc');


/* ----------------------------------------- */
/*  Lint Javascript
/* ----------------------------------------- */

const LINTING_PATHS = ["./dnd5e.js", "./module/"];
function lintJavascript() {
  const applyFixes = parsedArgs.hasOwnProperty("fix");
  const tasks = LINTING_PATHS.map((path) => {
    const src = path.endsWith("/") ? `${path}**/*.js` : path;
    const dest = path.endsWith("/") ? path : `${path.split("/").slice(0, -1).join("/")}/`;
    return gulp
      .src(src)
      .pipe(eslint({"fix": applyFixes}))
      .pipe(eslint.format())
      .pipe(gulpIf((file) => file.eslint != null && file.eslint.fixed, gulp.dest(dest)));
  });
  return mergeStream.call(null, tasks);
}
const jsLint = gulp.series(lintJavascript);


/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = gulp.series(
  gulp.parallel(css.compile),
  css.watchUpdates
);
exports.css = css.compile;
exports.cleanPacks = gulp.series(packs.clean);
exports.compilePacks = gulp.series(packs.compile);
exports.extractPacks = gulp.series(packs.extract);
exports.lint = jsLint;
