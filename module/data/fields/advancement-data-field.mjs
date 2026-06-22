import TypedField from "./typed-field.mjs";

/**
 * Data field that automatically selects the Advancement-specific configuration or value data models.
 *
 * @param {Advancement} advancementType  Advancement class to which this field belongs.
 */
export default class AdvancementDataField extends TypedField {
  constructor(advancementType, options={}) {
    super(options);
    this.advancementType = advancementType;
  }

  /* -------------------------------------------- */

  /** @override */
  getModel(type) {
    return this.advancementType.metadata?.dataModels?.[this.name];
  }

  /* -------------------------------------------- */

  /** @override */
  getDefaults(type) {
    return this.advancementType.metadata?.defaults?.[this.name] ?? {};
  }
}
