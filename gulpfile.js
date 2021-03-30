const gulp = require('gulp');
const gulpIf = require('gulp-if');
const eslint = require('gulp-eslint');

const css = require('./utils/css.js');
const packs = require('./utils/packs.js');




/* ----------------------------------------- */
/*  Lint Javascript
/* ----------------------------------------- */

const applyFixes = process.argv.slice(2).includes('--fix');
const DND5E_JS = [".eslintrc.json", "dnd5e.js", "module/**/*.js"];
function lintJavascript() {
  return gulp
    .src("module/**/*.js")
    .pipe(eslint({"fix": applyFixes}))
    .pipe(eslint.format())
    .pipe(gulpIf((file) => file.eslint != null && file.eslint.fixed, gulp.dest("module/")));
}
const jsLint = gulp.series(lintJavascript);


/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = gulp.series(
  gulp.parallel(css.compile),
  gulp.parallel(jsLint),
  css.watchUpdates
);
exports.css = css.compile;
exports.cleanPacks = gulp.series(packs.clean);
exports.compilePacks = gulp.series(packs.compile);
exports.extractPacks = gulp.series(packs.extract);
