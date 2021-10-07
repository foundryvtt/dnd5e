/* eslint-disable no-unused-vars */
/**
 * Deprecated.
 * @param {object} data
 * @param {object} options
 * @deprecated since 1.3.0
 * @ignore
 */
async function d20Dialog(data, options) {
  throw new Error("The d20Dialog helper method is deprecated in favor of D20Roll#configureDialog");
}

/**
 * Deprecated.
 * @param {object} data
 * @param {object} options
 * @deprecated since 1.3.0
 * @ignore
 */
async function damageDialog(data, options) {
  throw new Error("The damageDialog helper method is deprecated in favor of DamageRoll#configureDialog");
}
