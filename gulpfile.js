const gulp = require("gulp");
const rollup = require("rollup");
const nodeResolve = require("@rollup/plugin-node-resolve");

const css = require("./utils/css.js");
const linting = require("./utils/lint.js");
const packs = require("./utils/packs.js");

/* ---------------------------------------- */
/*  Module Rollup Build                     */
/* ---------------------------------------- */

async function rollupModule() {
  const bundle = await rollup.rollup({
    input: "./dnd5e.mjs",
    plugins: [nodeResolve.nodeResolve()]
  });
  await bundle.write({
    file: "dnd5e.js",
    format: "iife"
  });
}

function watchUpdates() {
  gulp.watch("./dnd5e.mjs", buildJS);
  gulp.watch("./module/**/*.mjs", buildJS);
  css.watchUpdates();
}

// Build JavaScript only
const buildJS = exports.buildJS = gulp.series(rollupModule);

// Build CSS only
exports.buildCSS = css.compile;

// Default export - build dev artifacts and watch for updates
exports.default = gulp.series(
  gulp.parallel(css.compile, rollupModule),
  watchUpdates
);

// Compendium pack management
exports.cleanPacks = gulp.series(packs.clean);
exports.compilePacks = gulp.series(packs.compile);
exports.extractPacks = gulp.series(packs.extract);

// JavaScript linting
exports.lint = gulp.series(linting.lint);

// Build all artifacts
exports.buildAll = gulp.parallel(
  css.compile,
  rollupModule,
  packs.compile
);
