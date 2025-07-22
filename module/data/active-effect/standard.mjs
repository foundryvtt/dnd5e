const { BooleanField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * System data model for standard active effects.
 */
export default class StandardEffectData extends foundry.abstract.TypeDataModel {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.EFFECT.STANDARD", "DND5E.EFFECT.RIDER"];

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      magical: new BooleanField({ initial: true }),
      rider: new SchemaField({
        statuses: new SetField(new StringField())
      })
    };
  }
}
