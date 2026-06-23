import TypeDataField5e from "./type-data-field.mjs";

/**
 * Data field that automatically selects the Advancement-specific configuration or value data models.
 *
 * @param {Advancement} advancementType  Advancement class to which this field belongs.
 */
export default class AdvancementDataField extends TypeDataField5e {
  constructor(advancementType, options={}) {
    super(options);
    this.advancementType = advancementType;
  }

  /* -------------------------------------------- */

  /** @override */
  getModelForType(type) {
    return this.advancementType.metadata?.dataModels?.[this.name];
  }

  /* -------------------------------------------- */

  /** @override */
  getDefaultsForType(type) {
    return this.advancementType.metadata?.defaults?.[this.name] ?? {};
  }
}
