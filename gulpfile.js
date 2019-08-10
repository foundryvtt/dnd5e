const gulp = require('gulp');
const concat = require('gulp-concat');
const less = require('gulp-less');

/* ----------------------------------------- */
/*  Concatenate JavaScript
/* ----------------------------------------- */

const DND5EScripts = ["scripts/**/*.js"];
function concatScripts() {
  return gulp.src(DND5EScripts)
    .pipe(concat('dnd5e.js'))
    .pipe(gulp.dest('./'));
}
const js = gulp.series(concatScripts);

/* ----------------------------------------- */
/*  Compile LESS
/* ----------------------------------------- */

const DND5eLess = ["less/*.less"];
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
  const targets = DND5EScripts.concat(DND5eLess);
  gulp.watch(targets, gulp.parallel(js, css));
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
