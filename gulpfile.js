const gulp = require('gulp');
const less = require('gulp-less');
const eslint = require('gulp-eslint');

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

const DND5E_JS = [".eslintrc.json", "dnd5e.js", "module/**/*.js"];
function lintJavascript() {
  return gulp
    .src("module/**/*.js")
    .pipe(eslint({}))
    .pipe(eslint.format());
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
  gulp.parallel(jsLint),
  watchUpdates
);
exports.css = css;
