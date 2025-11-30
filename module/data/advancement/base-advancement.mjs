import SparseDataModel from "../abstract/sparse-data-model.mjs";
import AdvancementDataField from "../fields/advancement-data-field.mjs";

const { DocumentFlagsField, DocumentIdField, FilePathField, NumberField, StringField } = foundry.data.fields;

/**
 * @import { BaseAdvancementData } from "./_types.mjs";
 */

/**
 * Base data model for advancement.
 * @extends {SparseDataModel<AdvancementData>}
 * @mixes AdvancementData
 */
export default class BaseAdvancementData extends SparseDataModel {

  /**
   * Name of this advancement type that will be stored in config and used for lookups.
   * @type {string}
   * @protected
   */
  static get typeName() {
    return this.name.replace(/Advancement$/, "");
  }

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
      type: new StringField({
        required: true, initial: this.typeName, validate: v => v === this.typeName,
        validationError: `must be the same as the Advancement type name ${this.typeName}`
      }),
      configuration: new AdvancementDataField(this, { required: true }),
      flags: new DocumentFlagsField(),
      value: new AdvancementDataField(this, { required: true }),
      level: new NumberField({
        integer: true, initial: this.metadata?.multiLevel ? undefined : 0, min: 0, label: "DND5E.Level"
      }),
      title: new StringField({ initial: undefined, label: "DND5E.AdvancementCustomTitle" }),
      hint: new StringField({ label: "DND5E.AdvancementHint" }),
      icon: new FilePathField({
        initial: undefined, categories: ["IMAGE"], label: "DND5E.AdvancementCustomIcon", base64: true
      }),
      classRestriction: new StringField({
        initial: undefined, choices: ["primary", "secondary"], label: "DND5E.AdvancementClassRestriction"
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    super.migrateData(source);
    if ( source.configuration?.hint ) source.hint = source.configuration.hint;
    return source;
  }
}
