const gulp = require('gulp');
const concat = require('gulp-concat');
const less = require('gulp-less');

/* ----------------------------------------- */
/*  Concatenate JavaScript
/* ----------------------------------------- */

const DND5E_SCRIPTS = ["scripts/**/*.js"];
function concatScripts() {
  return gulp.src(DND5E_SCRIPTS)
    .pipe(concat('dnd5e.js'))
    .pipe(gulp.dest('./'));
}
const js = gulp.series(concatScripts);

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
/*  Watch Updates
/* ----------------------------------------- */

function watchUpdates() {
  gulp.watch(DND5E_SCRIPTS, js);
  gulp.watch(DND5E_LESS, css);
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = gulp.series(
  gulp.parallel(js, css),
  watchUpdates
);
exports.js = js;
exports.css = css;
