import { createCheckboxInput } from "../../applications/fields.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { BooleanField, SetField, StringField } = foundry.data.fields;

/**
 * @import { TransformationSettingData } from "./_types.mjs";
 */

/**
 * A data model that represents the previous transformation preset.
 * @extends DataModel<TransformationSettingData>
 * @mixes TransformationSettingData
 */
export default class TransformationSetting extends foundry.abstract.DataModel {

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.TRANSFORM.Setting"];

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      effects: new SetField(new StringField(), { initial: () => TransformationSetting.#initial("effects") }),
      keep: new SetField(new StringField(), { initial: () => TransformationSetting.#initial("keep") }),
      merge: new SetField(new StringField(), { initial: () => TransformationSetting.#initial("merge") }),
      minimumAC: new FormulaField({ deterministic: true }),
      other: new SetField(new StringField(), { initial: () => TransformationSetting.#initial("other") }),
      preset: new StringField({ initial: null, nullable: true }),
      spellLists: new SetField(new StringField()),
      tempFormula: new FormulaField({ determinstic: true }),
      transformTokens: new BooleanField({ initial: true })
    };
  }

  /* -------------------------------------------- */

  /**
   * Categories that define sets of booleans.
   * @type {string[]}
   */
  static BOOLEAN_CATEGORIES = Object.seal(["keep", "merge", "effects", "other"]);

  /* -------------------------------------------- */

  /**
   * Populate the initial value for "effects", "keep", "merge", & "other" based on the settings.
   * @param {"effects"|"keep"|"merge"|"other"} category
   * @returns {string[]}
   */
  static #initial(category) {
    return Object.entries(CONFIG.DND5E.transformation[category])
      .filter(([, config]) => config.default)
      .map(([key]) => key);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Generate form categories populated with data from this settings object.
   * @param {object} [options={}]
   * @param {Actor5e} [options.host]   Actor being transformed. Should only be provided if using the dialog.
   * @param {string} [options.prefix]  Prefix before the field name.
   * @returns {{ category: string, title: string, hint: string, settings: object[] }[]}
   */
  createFormCategories({ host, prefix="" }={}) {
    const disabledFields = TransformationSetting.BOOLEAN_CATEGORIES.reduce((fields, cat) => {
      for ( const value of this[cat] ) {
        for ( const disable of CONFIG.DND5E.transformation[cat][value]?.disables ?? [] ) {
          if ( disable.includes("*") ) Object.keys(CONFIG.DND5E.transformation[disable.replace(".*", "")] ?? {})
            .filter(k => k !== value).forEach(k => fields.add(`${cat}.${k}`));
          else fields.add(disable);
        }
      }
      return fields;
    }, new Set());

    const otherSettings = Object.entries(TransformationSetting.schema.fields)
      .map(([name, field]) => name !== "preset" && !TransformationSetting.BOOLEAN_CATEGORIES.includes(name)
        ? this.createFormField(name, field, { host, prefix }) : null)
      .filter(_ => _);

    return TransformationSetting.BOOLEAN_CATEGORIES.map(cat => ({
      category: cat,
      title: `DND5E.TRANSFORM.Setting.FIELDS.${cat}.label`,
      hint: game.i18n.has(`DND5E.TRANSFORM.Setting.FIELDS.${cat}.hint`)
        ? `DND5E.TRANSFORM.Setting.FIELDS.${cat}.hint` : "",
      settings: [
        ...Object.entries(CONFIG.DND5E.transformation[cat]).map(([name, config]) => ({
          field: new BooleanField({ label: config.label, hint: config.hint }),
          disabled: disabledFields.has(`${cat}.${name}`),
          input: createCheckboxInput,
          name: `${prefix}${cat}.${name}`,
          value: disabledFields.has(`${cat}.${name}`) ? undefined : this[cat]?.has(name)
        })),
        ...(cat === "other" ? otherSettings : [])
      ]
    }));
  }

  /* -------------------------------------------- */

  /**
   * Create a field entry for form rendering for a non-boolean field.
   * @param {string} name              Name of the field.
   * @param {DataField} field          Underlying data field.
   * @param {object} options
   * @param {Actor5e} [options.host]   Actor being transformed.
   * @param {string} [options.prefix]  Prefix before the field name.
   * @returns {object}
   */
  createFormField(name, field, { prefix="", host }) {
    const descriptor = {
      field,
      name: `${prefix}${name}`,
      input: field instanceof BooleanField ? createCheckboxInput : undefined,
      value: this[name]
    };
    if ( name === "spellLists" ) descriptor.options = dnd5e.registry.spellLists.options.filter(o => {
      if ( !host ) return true;
      const [type, identifier] = o.value.split(":");
      return host.identifiedItems.get(identifier, type)?.size > 0;
    });
    return descriptor;
  }
}
