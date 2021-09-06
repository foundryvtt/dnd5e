const gulp = require('gulp');

const css = require('./css.js');
const packs = require('./packs.js');


exports.default = gulp.series(
  gulp.parallel(css.compile),
  css.watchUpdates
);
exports.css = css.compile;
exports.cleanPacks = gulp.series(packs.clean);
exports.compilePacks = gulp.series(packs.compile);
exports.extractPacks = gulp.series(packs.extract);
