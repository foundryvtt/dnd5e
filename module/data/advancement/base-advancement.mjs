import { SparseDataModel } from "../abstract.mjs";
import { AdvancementDataField } from "../fields.mjs";

export default class BaseAdvancement extends SparseDataModel {

  /**
   * Name of this advancement type that will be stored in config and used for lookups.
   * @type {string}
   * @protected
   */
  static get typeName() {
    return this.name.replace(/Advancement$/, "");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      _id: new foundry.data.fields.DocumentIdField({initial: () => foundry.utils.randomID()}),
      type: new foundry.data.fields.StringField({
        required: true, initial: this.typeName, validate: v => v === this.typeName,
        validationError: `must be the same as the Advancement type name ${this.typeName}`
      }),
      configuration: new AdvancementDataField(this, {required: true}),
      value: new AdvancementDataField(this, {required: true}),
      level: new foundry.data.fields.NumberField({
        integer: true, initial: this.metadata?.multiLevel ? undefined : 0, min: 0, label: "DND5E.Level"
      }),
      title: new foundry.data.fields.StringField({initial: undefined, label: "DND5E.AdvancementCustomTitle"}),
      icon: new foundry.data.fields.FilePathField({
        initial: undefined, categories: ["IMAGE"], label: "DND5E.AdvancementCustomIcon"
      }),
      classRestriction: new foundry.data.fields.StringField({
        initial: undefined, choices: ["primary", "secondary"], label: "DND5E.AdvancementClassRestriction"
      })
    };
  }
}
