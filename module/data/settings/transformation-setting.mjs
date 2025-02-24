import FormulaField from "../fields/formula-field.mjs";

const { BooleanField, SetField, StringField } = foundry.data.fields;

/**
 * @typedef TransformationSettingData
 * @property {Set<string>} effects
 * @property {Set<string>} keep
 * @property {Set<string>} merge
 * @property {Set<string>} other
 * @property {string} [preset]
 * @property {string} [tempFormula]       Formula for temp HP that will be added during transformation.
 * @property {boolean} [transformTokens]
 */

/**
 * A data model that represents the previous transformation preset.
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
      other: new SetField(new StringField(), { initial: () => TransformationSetting.#initial("other") }),
      preset: new StringField({ initial: null, nullable: true }),
      tempFormula: new FormulaField({ determinstic: true }),
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

  /* -------------------------------------------- */

  /**
   * Options that determine what properties of the original actor are kept and which are replaced with
   * the target actor.
   *
   * @typedef {object} TransformationOptions
   * @property {boolean} [keepPhysical=false]       Keep physical abilities (str, dex, con)
   * @property {boolean} [keepMental=false]         Keep mental abilities (int, wis, cha)
   * @property {boolean} [keepSaves=false]          Keep saving throw proficiencies
   * @property {boolean} [keepSkills=false]         Keep skill proficiencies
   * @property {boolean} [mergeSaves=false]         Take the maximum of the save proficiencies
   * @property {boolean} [mergeSkills=false]        Take the maximum of the skill proficiencies
   * @property {boolean} [keepClass=false]          Keep proficiency bonus
   * @property {boolean} [keepFeats=false]          Keep features
   * @property {boolean} [keepSpells=false]         Keep spells and spellcasting ability
   * @property {boolean} [keepItems=false]          Keep items
   * @property {boolean} [keepBio=false]            Keep biography
   * @property {boolean} [keepVision=false]         Keep vision
   * @property {boolean} [keepSelf=false]           Keep self
   * @property {boolean} [keepAE=false]             Keep all effects
   * @property {boolean} [keepOriginAE=true]        Keep effects which originate on this actor
   * @property {boolean} [keepOtherOriginAE=true]   Keep effects which originate on another actor
   * @property {boolean} [keepSpellAE=true]         Keep effects which originate from actors spells
   * @property {boolean} [keepFeatAE=true]          Keep effects which originate from actors features
   * @property {boolean} [keepEquipmentAE=true]     Keep effects which originate on actors equipment
   * @property {boolean} [keepClassAE=true]         Keep effects which originate from actors class/subclass
   * @property {boolean} [keepBackgroundAE=true]    Keep effects which originate from actors background
   * @property {boolean} [keepHP=false]             Keep HP & HD
   * @property {boolean} [keepType=false]           Keep creature type
   * @property {boolean} [addTemp=false]            Add temporary hit points equal to the target's max HP
   * @property {boolean} [transformTokens=true]     Transform linked tokens too
   * @property {string} [preset]                    The transformation preset used (if any).
   */

  /**
   * Create a transformation setting object from an old TransformationOptions object.
   * @param {TransformationOptions} options
   * @returns {TransformationSetting}
   * @deprecated since DnD5e 4.4, targeted for removal in DnD5e 5.0
   */
  static _fromDeprecatedConfig(options) {
    const settings = {};
    for ( const [k, v] of Object.entries(options ?? {}) ) {
      if ( v === false ) continue;
      const [category, key] = TransformationSetting._splitDeprecatedKey(k);
      if ( category ) {
        settings[category] ??= new Set();
        settings[category].add(key);
      } else {
        settings[k] = v;
      }
    }
    return new this(settings);
  }

  /* -------------------------------------------- */

  /**
   * Split a key in the old settings config to a new category and object.
   * @param {string} prop
   * @returns {string[]}
   * @internal
   */
  static _splitDeprecatedKey(prop) {
    let category;
    if ( prop.endsWith("AE") ) {
      if ( prop === "keepAE" ) return ["effects", "all"];
      category = "effects";
      prop = prop.replace("keep", "").replace("AE", "");
    } else if ( prop.startsWith("keep") ) {
      category = "keep";
      if ( prop === "keepHP" ) return ["keep", "hp"];
      else prop = prop.replace("keep", "");
    } else if ( prop.startsWith("merge") ) {
      category = "merge";
      prop = prop.replace("merge", "");
    } else {
      return [null, prop];
    }
    return [category, prop.charAt(0).toLowerCase() + prop.slice(1)];
  }

  /* -------------------------------------------- */

  /**
   * Convert a transformation setting to an old config object.
   * @returns {TransformationOptions}
   * @deprecated since DnD5e 4.4, targeted for removal in DnD5e 5.0
   */
  _toDeprecatedConfig() {
    const { effects, keep, merge, other, ...remainder } = this.toObject();
    return {
      ...Object.fromEntries(Array.from(effects ?? []).map(k => [`keep${k === "all" ? "" : k.capitalize()}AE`, true])),
      ...Object.fromEntries(Array.from(keep ?? []).map(k => [`keep${k === "hp" ? "HP" : k.capitalize()}`, true])),
      ...Object.fromEntries(Array.from(merge ?? []).map(k => [`merge${k.capitalize()}`, true])),
      ...Object.fromEntries(Array.from(other ?? []).map(k => [k, true])),
      ...remainder
    };
  }
}
