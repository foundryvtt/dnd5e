const gulp = require('gulp');

const css = require('./utils/css.js');
const linting = require("./utils/lint.js");
const packs = require('./utils/packs.js');


exports.default = gulp.series(
  gulp.parallel(css.compile),
  css.watchUpdates
);
exports.css = css.compile;
exports.cleanPacks = gulp.series(packs.clean);
exports.compilePacks = gulp.series(packs.compile);
exports.extractPacks = gulp.series(packs.extract);
exports.lint = gulp.series(linting.lint);
exports.buildAll = gulp.parallel(
  css.compile,
  packs.compile
);
