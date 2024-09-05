const { NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @typedef {object} SourceData
 * @property {string} book      Book/publication where the item originated.
 * @property {string} page      Page or section where the item can be found.
 * @property {string} custom    Fully custom source label.
 * @property {string} license   Type of license that covers this item.
 * @property {number} revision  Revision count for this item.
 * @property {string} rules     Version of the rules for this document (e.g. 2014 vs. 2024).
 */

/**
 * Data fields that stores information on the adventure or sourcebook where this document originated.
 */
export default class SourceField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      book: new StringField(),
      page: new StringField(),
      custom: new StringField(),
      license: new StringField(),
      revision: new NumberField({ initial: 1 }),
      rules: new StringField({ initial: "2024" }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.SOURCE.FIELDS.source.label", ...options });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare the source label.
   * @this {SourceData}
   * @param {string} uuid  Compendium source or document UUID.
   */
  static prepareData(uuid) {
    this.bookPlaceholder = SourceField.getModuleBook(uuid) ?? "";
    if ( !this.book ) this.book = this.bookPlaceholder;

    if ( this.custom ) this.label = this.custom;
    else {
      const page = Number.isNumeric(this.page)
        ? game.i18n.format("DND5E.SOURCE.Display.Page", { page: this.page }) : (this.page ?? "");
      this.label = game.i18n.format("DND5E.SOURCE.Display.Full", { book: this.book, page }).trim();
    }

    Object.defineProperty(this, "directlyEditable", {
      value: (this.custom ?? "") === this.label,
      enumerable: false
    });
  }

  /* -------------------------------------------- */

  /**
   * Based on the provided UUID, find the associated system/module and check it if has any source books registered
   * in its manifest. If it has only one, then return that book's key.
   * @param {string} uuid  Compendium source or document UUID.
   * @returns {string|null}
   */
  static getModuleBook(uuid) {
    let manifest;
    const pack = foundry.utils.parseUuid(uuid)?.collection?.metadata;
    switch ( pack?.packageType ) {
      case "module": manifest = game.modules.get(pack.packageName); break;
      case "system": manifest = game.system; break;
      case "world": manifest = game.world; break;
    }
    if ( !manifest ) return null;
    const sourceBooks = manifest.flags?.dnd5e?.sourceBooks;
    const keys = Object.keys(sourceBooks ?? {});
    if ( keys.length !== 1 ) return null;
    return keys[0];
  }

  /* -------------------------------------------- */
  /*  Shims                                       */
  /* -------------------------------------------- */

  /**
   * Add a shim for the old source path.
   * @this {ActorDataModel}
   */
  static shimActor() {
    const source = this.source;
    Object.defineProperty(this.details, "source", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The source data for actors has been moved to `system.source`.",
          { since: "DnD5e 4.0", until: "DnD5e 4.4" }
        );
        return source;
      }
    });
  }
}
