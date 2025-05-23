import SparseDataModel from "../abstract/sparse-data-model.mjs";
import AdvancementDataField from "../fields/advancement-data-field.mjs";

const { DocumentIdField, FilePathField, NumberField, StringField } = foundry.data.fields;

/**
 * Base data model for advancement.
 *
 * @property {string} _id               The advancement's ID.
 * @property {string} type              Type of advancement.
 * @property {*} configuration          Type-specific configuration data.
 * @property {*} value                  Type-specific value data after the advancement is applied.
 * @property {number} level             For single-level advancement, the level at which it should apply.
 * @property {string} title             Optional custom title.
 * @property {string} hint              Brief description of what the advancement does or guidance for the player.
 * @property {string} icon              Optional custom icon.
 * @property {string} classRestriction  Should this advancement apply at all times, only when on the first class on
 *                                      an actor, or only on a class that is multi-classing?
 */
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

  /** @override */
  static defineSchema() {
    return {
      _id: new DocumentIdField({initial: () => foundry.utils.randomID()}),
      type: new StringField({
        required: true, initial: this.typeName, validate: v => v === this.typeName,
        validationError: `must be the same as the Advancement type name ${this.typeName}`
      }),
      configuration: new AdvancementDataField(this, {required: true}),
      value: new AdvancementDataField(this, {required: true}),
      level: new NumberField({
        integer: true, initial: this.metadata?.multiLevel ? undefined : 0, min: 0, label: "DND5E.Level"
      }),
      title: new StringField({initial: undefined, label: "DND5E.AdvancementCustomTitle"}),
      hint: new StringField({label: "DND5E.AdvancementHint"}),
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
