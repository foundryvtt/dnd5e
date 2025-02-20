const { BooleanField, SetField, StringField } = foundry.data.fields;

/**
 * @typedef TransformationSettingData
 * @property {Set<string>} effects
 * @property {Set<string>} keep
 * @property {Set<string>} merge
 * @property {Set<string>} other
 * @property {string} [preset]
 * @property {boolean} [transformTokens]
 */

/**
 * A data model that represents the previous transformation preset.
 */
export default class TransformationSetting extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      effects: new SetField(new StringField(), { initial: () => TransformationSetting.#initial("effects") }),
      keep: new SetField(new StringField(), { initial: () => TransformationSetting.#initial("keep") }),
      merge: new SetField(new StringField(), { initial: () => TransformationSetting.#initial("merge") }),
      other: new SetField(new StringField(), { initial: () => TransformationSetting.#initial("other") }),
      preset: new StringField({ initial: null, nullable: true }),
      transformTokens: new BooleanField({ initial: true })
    };
  }

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
}
