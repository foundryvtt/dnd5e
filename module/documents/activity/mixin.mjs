import PseudoDocumentMixin from "../mixins/pseudo-document.mjs";

/**
 * Mixin used to provide base logic to all activities.
 * @type {function(Class): Class}
 * @mixin
 */
export default Base => class extends PseudoDocumentMixin(Base) {
  /**
   * Configuration information for Activities.
   *
   * @typedef {PseudoDocumentsMetadata} ActivityMetadata
   * @property {string} type   Type name of this activity.
   * @property {string} img    Default icon.
   * @property {string} title  Default title.
   */

  /**
   * Configuration information for this PseudoDocument.
   * @type {PseudoDocumentsMetadata}
   */
  static metadata = Object.freeze({
    name: "Activity",
    collection: "activities"
  });

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Activity.
   * @param {object} [options]
   * @param {boolean} [options.deterministic]  Whether to force deterministic values for data properties that could
   *                                           be either a die term or a flat term.
   * @returns {object}
   */
  getRollData(options) {
    return this.item.getRollData(options);
  }
};
