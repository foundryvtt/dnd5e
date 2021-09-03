const gulp = require('gulp');
const less = require('gulp-less');

const { LESS_DEST, LESS_SRC, LESS_WATCH } = require('./paths.js');


/**
 * Compile the LESS sources into a single CSS file.
 */
function compileLESS() {
  return gulp.src(LESS_SRC)
    .pipe(less())
    .pipe(gulp.dest(LESS_DEST))
}
const compile = gulp.series(compileLESS);


/**
 * Update the CSS if any of the LESS sources are modified.
 */
function watchUpdates() {
  gulp.watch(LESS_WATCH, compile);
}


module.exports = { compile, watchUpdates };
