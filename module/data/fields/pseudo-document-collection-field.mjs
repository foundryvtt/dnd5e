import PseudoDocumentCollection from "../abstract/pseudo-document-collection.mjs";
import PseudoDocumentField from "./pseudo-document-field.mjs";

/**
 * Field type for storing collections of pseudo-documents such as activities and advancement.
 */
export default class PseudoDocumentCollectionField extends foundry.data.fields.TypedObjectField {
  /**
   * @param {typeof PseudoDocument} element  The type of Document which belongs to this embedded collection.
   * @param {DataFieldOptions} [options]     Options which configure the behavior of the field.
   * @param {DataFieldContext} [context]     Additional context which describes the field.
   */
  constructor(element, options={}, context={}) {
    super(new PseudoDocumentField(element), options, context);
    this.readonly = true;
  }

  /* -------------------------------------------- */

  /**
   * The Collection implementation to use when initializing the collection.
   * @type {typeof PseudoDocumentCollection}
   */
  static get implementation() {
    return PseudoDocumentCollection;
  }

  /* -------------------------------------------- */

  /** @override */
  static hierarchical = true;

  /* -------------------------------------------- */

  /** @override */
  initialize(value, model, options={}) {
    const collection = model.parent.pseudoCollections[this.name];
    collection.initialize(model, options);
    return collection;
  }

  /* -------------------------------------------- */

  /** @override */
  _updateCommit(source, key, value, diff, options) {
    let src = source[key];

    // Special Cases: * -> undefined, * -> null, undefined -> *, null -> *
    if ( !src || !value ) {
      source[key] = value;
      return;
    }

    // Reconstruct the source array, retaining object references
    for ( let [id, d] of Object.entries(diff) ) {
      if ( foundry.utils.isDeletionKey(id) ) {
        if ( id[0] === "-" ) {
          delete source[key][id.slice(2)];
          continue;
        }
        id = id.slice(2);
      }
      const prior = src[id];
      if ( prior ) {
        this.element._updateCommit(src, id, value[id], d, options);
        src[id] = prior;
      }
      else src[id] = d;
    }
  }
}
