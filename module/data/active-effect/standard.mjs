const { ActiveEffectTypeDataModel } = foundry.data;
const { BooleanField, SchemaField, SetField, StringField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * System data model for standard active effects.
 */
export default class StandardEffectData extends (ActiveEffectTypeDataModel ?? TypeDataModel) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.EFFECT.STANDARD", "DND5E.EFFECT.RIDER"];

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...(ActiveEffectTypeDataModel ? super.defineSchema() : {}),
      magical: new BooleanField(),
      rider: new SchemaField({
        statuses: new SetField(new StringField())
      })
    };
  }
}
