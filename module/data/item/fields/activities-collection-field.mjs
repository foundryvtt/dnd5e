import UtilityActivity from "../../../documents/activity/utility.mjs";
import PseudoDocumentCollection from "../../abstract/pseudo-document-collection.mjs";
import PseudoDocumentCollectionField from "../../fields/pseudo-document-collection-field.mjs";

/**
 * Field type for storing collections of activities.
 */
export default class ActivitiesCollectionField extends PseudoDocumentCollectionField {
  /**
   * @param {DataFieldOptions} [options]     Options which configure the behavior of the field.
   * @param {DataFieldContext} [context]     Additional context which describes the field.
   */
  constructor(options, context) {
    super(UtilityActivity, options, context);
  }

  /* -------------------------------------------- */

  /** @override */
  static get implementation() {
    return ActivityCollection;
  }
}

/**
 * Specialized collection type for stored activities.
 */
class ActivityCollection extends PseudoDocumentCollection {
  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Fetch an array of activities of a certain type.
   * @param {string} type  Activity type.
   * @returns {Activity[]}
   */
  getByType(type) {
    return this.documentsByType[type] ?? [];
  }

  /* -------------------------------------------- */

  /**
   * Generator that yields activities for each of the provided types.
   * @param {string[]} types  Types to fetch.
   * @yields {Activity}
   */
  *getByTypes(...types) {
    for ( const type of types ) {
      for ( const activity of this.documentsByType[type] ?? [] ) yield activity;
    }
  }
}
