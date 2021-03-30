const gulp = require('gulp');
const eslint = require('gulp-eslint');

const css = require('./utils/css.js');
const packs = require('./utils/packs.js');




/* ----------------------------------------- */
/*  Lint Javascript
/* ----------------------------------------- */

function lintJavascript() {
  return gulp
    .src("module/**/*.js")
    .pipe(eslint({}))
    .pipe(eslint.format());
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
