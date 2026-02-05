import Advancement from "../../../documents/advancement/advancement.mjs";
import PseudoDocumentCollection from "../../abstract/pseudo-document-collection.mjs";
import PseudoDocumentCollectionField from "../../fields/pseudo-document-collection-field.mjs";

/**
 * Field type for storing collections of advancement.
 */
export default class AdvancementCollectionField extends PseudoDocumentCollectionField {
  /**
   * @param {DataFieldOptions} [options]     Options which configure the behavior of the field.
   * @param {DataFieldContext} [context]     Additional context which describes the field.
   */
  constructor(options, context) {
    super(Advancement, options, context);
  }

  /* -------------------------------------------- */

  /** @override */
  static get implementation() {
    return AdvancementCollection;
  }
}

const NEEDS_CONFIGURATION = Symbol("Needs Configuration");

/**
 * Specialized collection type for stored advancement documents.
 */
class AdvancementCollection extends PseudoDocumentCollection {
  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @deprecated */
  get byId() {
    foundry.utils.logCompatibilityWarning(
      "Item's `advancement.byId` is deprecated in favor of using the `advancement.get` method.",
      { since: "DnD5e 5.2", until: "DnD5e 5.4" }
    );
    return new Proxy(this, {
      get(target, prop) {
        return target.get(prop);
      }
    });
  }

  /* -------------------------------------------- */

  /** @deprecated */
  get byLevel() {
    foundry.utils.logCompatibilityWarning(
      "Item's `advancement.byLevel` is deprecated in favor of the `advancement.documentsByLevel` property.",
      { since: "DnD5e 5.2", until: "DnD5e 5.4" }
    );
    return this.documentsByLevel;
  }

  /* -------------------------------------------- */

  /** @deprecated */
  get byType() {
    foundry.utils.logCompatibilityWarning(
      "Item's `advancement.byType` is deprecated in favor of the `advancement.documentsByType` property.",
      { since: "DnD5e 5.2", until: "DnD5e 5.4" }
    );
    return this.documentsByType;
  }

  /* -------------------------------------------- */

  /**
   * A cache of this collection's contents grouped by level.
   * @type {Record<number, Advancement[]>|null}
   */
  #documentsByLevel = null;

  /* -------------------------------------------- */

  /**
   * This collection's contents grouped by level, lazily (re-)computed as needed.
   * @type {Record<number, Advancement[]>}
   */
  get documentsByLevel() {
    if ( this.#documentsByLevel ) return this.#documentsByLevel;
    const levels = Object.fromEntries(
      Array.fromRange(CONFIG.DND5E.maxLevel + 1).slice(this.#minimumAdvancementLevel).map(l => [l, []])
    );
    levels[NEEDS_CONFIGURATION] = [];
    for ( const doc of this.values() ) {
      doc.levels.forEach(l => levels[l]?.push(doc));
      if ( !doc.levels.length || ((doc.levels.length === 1) && (doc.levels[0] < this.#minimumAdvancementLevel)) ) {
        levels[NEEDS_CONFIGURATION].push(doc);
      }
    }
    Object.entries(levels).forEach(([lvl, data]) => data.sort((lhs, rhs) => {
      return lhs.sortingValueForLevel(lvl).localeCompare(rhs.sortingValueForLevel(lvl), game.i18n.lang);
    }));
    return this.#documentsByLevel = levels;
  }

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
   * Minimum level of advancement allowed for a given document type.
   * @type {number}
   */
  get #minimumAdvancementLevel() {
    return ["class", "subclass"].includes(this.parent.parent.type) ? 1 : 0;
  }

  /* -------------------------------------------- */

  /**
   * Any advancement documents that need to be configured to work properly.
   * @type {Advancement[]}
   */
  get needingConfiguration() {
    return this.documentsByLevel[NEEDS_CONFIGURATION];
  }

  /* -------------------------------------------- */
  /*  Collection Initialization                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  initialize(model, options={}) {
    this.#documentsByLevel = null;
    super.initialize(model, options);
  }
}
