/**
 * Config sheet for the Difficult Terrain region behavior.
 */
export default class DifficultTerrainConfig extends foundry.applications.sheets.RegionBehaviorConfig {
  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _getFields() {
    const fieldsets = super._getFields();
    for ( const fieldset of fieldsets ) {
      const typesField = fieldset.fields.find(f => f.field.name === "types")?.field;
      if ( typesField ) {
        typesField.element.choices = CONFIG.DND5E.difficultTerrainTypes;
        break;
      }
    }
    return fieldsets;
  }
}
