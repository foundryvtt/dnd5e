const { SchemaField, StringField } = foundry.data.fields;

/**
 * @typedef {object} SourceData
 * @property {string} book     Book/publication where the item originated.
 * @property {string} page     Page or section where the item can be found.
 * @property {string} custom   Fully custom source label.
 * @property {string} license  Type of license that covers this item.
 */

/**
 * Data fields that stores information on the adventure or sourcebook where this document originated.
 *
 * @property {string} book     Book/publication where the item originated.
 * @property {string} page     Page or section where the item can be found.
 * @property {string} custom   Fully custom source label.
 * @property {string} license  Type of license that covers this item.
 */
export default class SourceField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      book: new StringField({label: "DND5E.SourceBook"}),
      page: new StringField({label: "DND5E.SourcePage"}),
      custom: new StringField({label: "DND5E.SourceCustom"}),
      license: new StringField({label: "DND5E.SourceLicense"}),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.Source", ...options });
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
        ? game.i18n.format("DND5E.SourcePageDisplay", { page: this.page }) : (this.page ?? "");
      this.label = game.i18n.format("DND5E.SourceDisplay", { book: this.book, page }).trim();
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
}
