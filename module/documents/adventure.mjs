/**
 * Extend the base Adventure class to implement system-specific logic.
 * @extends {Adventure}
 */
export default class Adventure5e extends foundry.documents.Adventure {
  /** @inheritDoc */
  static migrateData(source) {
    if ( source.actors?.length ) {
      for ( const a of source.actors ) {
        // Migrate encounter groups to their own Actor type.
        if ( (a.type === "group") && (a.system?.type?.value === "encounter") ) a.type = "encounter";
      }
    }
    return super.migrateData(source);
  }
}
