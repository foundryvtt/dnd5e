const parsedArgs = require("yargs").argv;

const eslint = require("gulp-eslint7");
const gulp = require("gulp");
const gulpIf = require("gulp-if");
const mergeStream = require("merge-stream");


/**
 * Paths of javascript files that should be linted.
 * @type {string[]}
 */
const LINTING_PATHS = ["./dnd5e.js", "./module/"];


/**
 * Lint javascript sources and optionally applies fixes.
 *
 * - `gulp lint` - Lint all javascript files.
 * - `gulp lint --fix` - Lint and apply available fixes automatically.
 */
function lintJavascript() {
  const applyFixes = !!parsedArgs.fix;
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
exports.lint = lintJavascript;
