const gulp = require('gulp');
const gulpIf = require('gulp-if');
const less = require('gulp-less');
const eslint = require('gulp-eslint');
require('eslint-plugin-jsdoc');

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
/*  Watch Updates
/* ----------------------------------------- */

function watchUpdates() {
  gulp.watch(DND5E_LESS, css);
  gulp.watch(DND5E_JS, jsLint);
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = gulp.series(
  gulp.parallel(css),
  watchUpdates
);
exports.css = css;
exports.lint = jsLint;
