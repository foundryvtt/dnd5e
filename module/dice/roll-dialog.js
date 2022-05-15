/* eslint-disable no-unused-vars */
/**
 * Deprecated.
 * @param {object} data
 * @param {object} options
 * @deprecated since 1.3, targeted for removal in 1.8
 * @ignore
 */
async function d20Dialog(data, options) {
  throw new Error("The d20Dialog helper method is deprecated in favor of D20Roll#configureDialog and will be removed in 1.8");
}

/**
 * Deprecated.
 * @param {object} data
 * @param {object} options
 * @deprecated since 1.3, targeted for removal in 1.8
 * @ignore
 */
async function damageDialog(data, options) {
  throw new Error("The damageDialog helper method is deprecated in favor of DamageRoll#configureDialog and will be removed in 1.8");
}
