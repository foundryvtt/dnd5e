import BaseAdvancement from "../advancement/base-advancement.mjs";
import AdvancementField from "./advancement-field.mjs";
import MappingField from "./mapping-field.mjs";

/**
 * Field that stores advancement on an item.
 */
export default class AdvancementCollectionField extends MappingField {
  constructor(options) {
    foundry.utils.logCompatibilityWarning(
      "Usage of `AdvancementCollectionField` has been deprecated in favor of mixing in `AdvancementTemplate`.",
      { since: "DnD5e 5.2", until: "DnD5e 5.4", once: true }
    );
    super(new AdvancementField(), options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  initialize(value, model, options) {
    const advancement = Object.values(super.initialize(value, model, options));
    return new AdvancementCollection(model, advancement);
  }
}

/* -------------------------------------------- */

/**
 * Specialized collection type for stored advancement documents.
 * @param {DataModel} model        The parent DataModel to which this AdvancementCollection belongs.
 * @param {Advancement[]} entries  The advancement documents to store.
 */
class AdvancementCollection extends Collection {
  constructor(model, entries) {
    super();
    this.#model = model;
    for ( const entry of entries ) {
      if ( !(entry instanceof BaseAdvancement) ) continue;
      this.set(entry._id, entry);
    }
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @deprecated */
  get length() {
    foundry.utils.logCompatibilityWarning(
      "Checking advancement on an item should no longer use `length` but `size`.",
      { since: "DnD5e 5.2", until: "DnD5e 5.4" }
    );
    return this.size;
  }

  /* -------------------------------------------- */

  /**
   * The parent DataModel to which this AdvancementCollection belongs.
   * @type {DataModel}
   */
  #model;

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Convert the AdvancementCollection to an array of simple objects.
   * @param {boolean} [source=true]  Draw data for contained Documents from the underlying data source?
   * @returns {object[]}             The extracted array of primitive objects.
   */
  toObject(source=true) {
    return this.map(doc => doc.toObject(source));
  }
}
