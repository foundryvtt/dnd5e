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
    const pkg = SourceField.getPackage(uuid);
    this.bookPlaceholder = SourceField.getModuleBook(pkg) ?? "";
    if ( !this.book ) this.book = this.bookPlaceholder;

    if ( this.custom ) this.label = this.custom;
    else {
      const page = Number.isNumeric(this.page)
        ? game.i18n.format("DND5E.SOURCE.Display.Page", { page: this.page }) : (this.page ?? "");
      this.label = game.i18n.format("DND5E.SOURCE.Display.Full", { book: this.book, page }).trim();
    }

    this.value = this.book || (pkg?.title ?? "");
    this.slug = this.value.slugify({ strict: true });

    Object.defineProperty(this, "directlyEditable", {
      value: (this.custom ?? "") === this.label,
      configurable: true,
      enumerable: false
    });
  }

  /* -------------------------------------------- */

  /**
   * Check if the provided package has any source books registered in its manifest. If it has only one, then return
   * that book's key.
   * @param {ClientPackage} pkg  The package.
   * @returns {string|null}
   */
  static getModuleBook(pkg) {
    if ( !pkg ) return null;
    const sourceBooks = pkg.flags?.dnd5e?.sourceBooks;
    const keys = Object.keys(sourceBooks ?? {});
    if ( keys.length !== 1 ) return null;
    return keys[0];
  }

  /* -------------------------------------------- */

  /**
   * Get the package associated with the given UUID, if any.
   * @param {string} uuid  The UUID.
   * @returns {ClientPackage|null}
   */
  static getPackage(uuid) {
    if ( !uuid ) return null;
    const pack = foundry.utils.parseUuid(uuid)?.collection?.metadata;
    switch ( pack?.packageType ) {
      case "module": return game.modules.get(pack.packageName);
      case "system": return game.system;
      case "world": return game.world;
    }
    return null;
  }
}
