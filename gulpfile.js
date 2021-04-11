const gulp = require('gulp');
const gulpIf = require('gulp-if');
const less = require('gulp-less');
const mergeStream = require("merge-stream");

const parsedArgs = require('minimist')(process.argv.slice(2));

// Code Linting
const eslint = require('gulp-eslint');
require('babel-eslint');
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
exports.lint = jsLint;
