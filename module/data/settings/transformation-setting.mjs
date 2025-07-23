import { createCheckboxInput } from "../../applications/fields.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { BooleanField, SetField, StringField } = foundry.data.fields;

/**
 * @typedef TransformationSettingData
 * @property {Set<string>} effects
 * @property {Set<string>} keep
 * @property {Set<string>} merge
 * @property {string} [minimumAC]         Formula for minimum armor class for transformed creature.
 * @property {Set<string>} other
 * @property {string} [preset]
 * @property {Set<string>} [spellLists]   Spell lists to keep if actor has matching item.
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
   * @deprecated since DnD5e 4.4, targeted for removal in DnD5e 5.2
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
   * @deprecated since DnD5e 4.4, targeted for removal in DnD5e 5.2
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

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Generate form categories populated with data from this settings object.
   * @param {object} [options={}]
   * @param {string} [options.prefix]  Prefix before the field name.
   * @returns {{ category: string, title: string, hint: string, settings: object[] }[]}
   */
  createFormCategories({ prefix="" }={}) {
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
        ? this.createFormField(name, field, { prefix }) : null)
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
   * @param {string} [options.prefix]  Prefix before the field name.
   * @returns {object}
   */
  createFormField(name, field, { prefix="" }) {
    const descriptor = {
      field,
      name: `${prefix}${name}`,
      input: field instanceof BooleanField ? createCheckboxInput : undefined,
      value: this[name]
    };
    if ( name === "spellLists" ) descriptor.options = dnd5e.registry.spellLists.options;
    return descriptor;
  }
}
