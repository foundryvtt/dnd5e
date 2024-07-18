/**
 * Configuration data for the size advancement type.
 */
export class SizeConfigurationData extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      sizes: new foundry.data.fields.SetField(
        new foundry.data.fields.StringField(), {required: false, initial: ["med"], label: "DND5E.Size"}
      )
    };
  }

  /* -------------------------------------------- */

  get hint() {
    foundry.utils.logCompatibilityWarning(
      "Advancement hints are now part of the base data model.",
      { since: "DnD5e 3.3", until: "DnD5e 4.1" }
    );
    return this.parent.hint ?? "";
  }
}

/**
 * Value data for the size advancement type.
 */
export class SizeValueData extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      size: new foundry.data.fields.StringField({required: false, label: "DND5E.Size"})
    };
  }
}
