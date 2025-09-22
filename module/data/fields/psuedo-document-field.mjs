/**
 * Data field that selects the appropriate PseudoDocument data model if available, otherwise defaults to generic
 * `ObjectField` to prevent issues with custom pseudo-document types that aren't currently loaded.
 */
export default class PsuedoDocumentField extends foundry.data.fields.ObjectField {
  /**
   * @param {typeof PseudoDocument} element  The type of Document which belongs to this field.
   * @param {DataFieldOptions} [options]     Options which configure the behavior of the field.
   * @param {DataFieldContext} [context]     Additional context which describes the field.
   */
  constructor(element, options, context) {
    super(options, context);
    this.element = element;
  }

  /* -------------------------------------------- */

  /** @override */
  static recursive = true;

  /* -------------------------------------------- */

  /**
   * Get the PseudoDocument definition for the specified advancement type.
   * @param {string} type                   The document type.
   * @returns {typeof PseudoDocument|null}  The PseudoDocument class, or null.
   */
  getModelForType(type) {
    return this.element.documentConfig[type]?.documentClass ?? null;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _cleanType(value, options) {
    if ( !(typeof value === "object") ) value = {};

    const cls = this.getModelForType(value.type);
    if ( cls ) return cls.cleanData(value, options);
    return value;
  }

  /* -------------------------------------------- */

  /**
   * Migrate this field's candidate source data.
   * @param {object} sourceData   Candidate source data of the root model
   * @param {any} fieldData       The value of this field within the source data
   */
  migrateSource(sourceData, fieldData) {
    const cls = this.getModelForType(fieldData.type);
    if ( cls ) cls.migrateDataSafe(fieldData);
  }

  /* -------------------------------------------- */

  /** @override */
  _updateCommit(source, key, value, diff, options) {
    const s = source[key];

    // Special Cases: * -> undefined, * -> null, undefined -> *, null -> *
    if ( !s || !value ) {
      source[key] = value;
      return;
    }

    // Update fields in source which changed in the diff
    const element = this.element.documentConfig[value.type]?.documentClass ?? this.element;
    for ( let [k, d] of Object.entries(diff) ) {
      k = foundry.utils.isDeletionKey(k) ? k.slice(2) : k;
      const field = element.schema.getField(k);
      if ( !field ) continue;
      field._updateCommit(s, k, value[k], d, options);
    }
  }
}
