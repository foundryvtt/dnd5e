const { DocumentIdField, DocumentUUIDField, FilePathField, SchemaField, StringField } = foundry.data.fields;

/**
 * A field describing the document a card was created from.
 */
export default class SourceReferenceField extends SchemaField {
  constructor(fields={}, options={}) {
    super({
      id: new DocumentIdField(),
      img: new FilePathField({ categories: ["IMAGE"] }),
      name: new StringField(),
      type: new StringField(),
      uuid: new DocumentUUIDField(),
      ...fields
    }, options);
  }
}
