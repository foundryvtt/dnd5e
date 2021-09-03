const gulp = require('gulp');

const css = require('./css.js');
const { cleanPacks } = require('./cleanPacks.js');
const { compilePacks } = require('./compilePacks.js');
const { extractPacks } = require('./extractPacks.js');


exports.default = gulp.series(
  gulp.parallel(css.compile),
  css.watchUpdates
);
exports.css = css.compile;
exports.cleanPacks = gulp.series(cleanPacks);
exports.compilePacks = gulp.series(compilePacks);
exports.extractPacks = gulp.series(extractPacks);
