import { AdvancementDataField } from "../fields.mjs";

export default class BaseAdvancement extends foundry.abstract.DataModel {

  /**
   * Name of this advancement type that will be stored in config and used for lookups.
   * @type {string}
   * @protected
   */
  static get typeName() {
    return this.name.replace(/Advancement$/, "");
  }

  /* -------------------------------------------- */

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
        integer: true, initial: this.metadata?.multiLevel ? undefined : 1, min: 0, label: "DND5E.Level"
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

  /* -------------------------------------------- */

  /** @inheritdoc */
  toObject(source=true) {
    if ( !source ) return super.toObject(source);
    const clone = foundry.utils.deepClone(this._source);
    // Remove any undefined keys from the source data
    Object.keys(clone).filter(k => clone[k] === undefined).forEach(k => delete clone[k]);
    return clone;
  }
}
