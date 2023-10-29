const { SchemaField, StringField } = foundry.data.fields;

/**
 * Data fields that stores information on the adventure or sourcebook where this document originated.
 *
 * @property {string} book     Book/publication where the item originated.
 * @property {string} page     Page or section where the item can be found.
 * @property {string} custom   Fully custom source label.
 * @property {string} uuid     Upstream source of this data if it originated in another compendium.
 * @property {string} license  Type of license that covers this item.
 */
export default class SourceTemplate extends SchemaField {
  constructor(fields={}, options={}) {
    super({
      book: new StringField(),
      page: new StringField(),
      custom: new StringField(),
      uuid: new StringField(), // TODO: Convert to UUIDField with v12
      license: new StringField(),
      ...fields
    }, { label: "DND5E.Source", ...options });
  }

  /* -------------------------------------------- */

  initialize(value, model, options={}) {
    const obj = super.initialize(value, model, options);

    Object.defineProperty(obj, "label", {
      get() {
        // TODO: Implement logic for generating source
        return this.custom ?? "";
      },
      enumerable: false
    });
    Object.defineProperty(obj, "toString", {
      value: () => {
        foundry.utils.logCompatibilityWarning("Source has been converted to an object, the label can now be accessed "
         + "using the `source#label` property.", { since: "DnD5e 2.4", until: "DnD5e 2.6" });
        return obj.label;
      },
      enumerable: false
    });

    return obj;
  }
}
