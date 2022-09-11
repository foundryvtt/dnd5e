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
      _id: new foundry.data.fields.DocumentIdField({initial: () => foundry.utils.randomID(), label: ""}),
      type: new foundry.data.fields.StringField({required: true, initial: this.typeName, label: ""}),
      configuration: new AdvancementDataField(this, {required: true, label: ""}),
      value: new AdvancementDataField(this, {required: true, label: ""}),
      level: new foundry.data.fields.NumberField({integer: true, initial: 1, min: 0, label: ""}),
      title: new foundry.data.fields.StringField({initial: undefined, label: ""}),
      icon: new foundry.data.fields.FilePathField({initial: undefined, categories: ["IMAGE"], label: ""}),
      // TODO: Invalid value entered here prevents any advancement from being loaded
      classRestriction: new foundry.data.fields.StringField({
        initial: undefined, blank: true, choices: ["primary", "secondary"], label: ""
      })
    };
  }
}
