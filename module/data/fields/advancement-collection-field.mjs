import BaseAdvancement from "../advancement/base-advancement.mjs";
import AdvancementField from "./advancement-field.mjs";
import MappingField from "./mapping-field.mjs";

/**
 * Field that stores advancement on an item.
 */
export default class AdvancementCollectionField extends MappingField {
  constructor(options) {
    super(new AdvancementField(), options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  initialize(value, model, options) {
    // Advancements are created via updates to the parent Item. Update deltas that return from the server are not
    // cleaned as they are assumed to be good. For sparse data models, this means those sparse fields are not present
    // in the update delta since they do not survive serialization. Therefore, we must always clean sparse data models.
    if ( game.release.generation > 13 ) options = { ...options, clean: { copy: false } };
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
      { since: "DnD5e 5.2", until: "DnD5e 6.0" }
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
