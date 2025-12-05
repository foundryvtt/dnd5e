import { formatNumber, linkForUuid } from "../../../utils.mjs";
import SystemDataModel from "../../abstract/system-data-model.mjs";
import { FormulaField } from "../../fields/_module.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, EmbeddedDataField, IntegerSortField, NumberField, StringField
} = foundry.data.fields;

/**
 * @import { StartingEquipmentTemplate } from "./_types.mjs";
 */

/**
 * Data model template representing a background & class's starting equipment.
 * @extends {SystemDataModel<StartingEquipmentTemplateData>}
 * @mixin
 */
export default class StartingEquipmentTemplate extends SystemDataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      startingEquipment: new ArrayField(new EmbeddedDataField(EquipmentEntryData), {required: true}),
      wealth: new FormulaField({ label: "DND5E.StartingEquipment.Wealth.Label",
        hint: "DND5E.StartingEquipment.Wealth.Hint" })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * HTML formatted description of the starting equipment on this item.
   * @type {string}
   */
  get startingEquipmentDescription() {
    return this.getStartingEquipmentDescription();
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Create a HTML formatted description of the starting equipment on this item.
   * @param {object} [options={}]
   * @param {boolean} [options.modernStyle]       Should this be formatted according to modern rules or legacy.
   * @returns {string}
   */
  getStartingEquipmentDescription({ modernStyle }={}) {
    const topLevel = this.startingEquipment.filter(e => !e.group);
    if ( !topLevel.length ) return "";

    // If more than one entry, display as an unordered list (like for legacy classes)
    if ( topLevel.length > 1 ) {
      return `<ul>${topLevel.map(e => `<li>${e.generateLabel({ modernStyle })}</li>`).join("")}</ul>`;
    }

    // For modern classes, display as "Choose A or B"
    modernStyle ??= (this.source.rules === "2024")
      || (!this.source.rules && (dnd5e.settings.rulesVersion === "modern"));
    if ( modernStyle ) {
      const entries = topLevel[0].type === "OR" ? topLevel[0].children : topLevel;
      if ( this.wealth ) entries.push(new EquipmentEntryData({ type: "currency", key: "gp", count: this.wealth }));
      if ( entries.length > 1 ) {
        const usedPrefixes = [];
        const choices = EquipmentEntryData.prefixOrEntries(
          entries.map(e => e.generateLabel({ modernStyle, depth: 2 })), { modernStyle, usedPrefixes }
        );
        const formatter = game.i18n.getListFormatter({ type: "disjunction" });
        return `<p>${game.i18n.format("DND5E.StartingEquipment.ChooseList", {
          prefixes: formatter.format(usedPrefixes), choices: formatter.format(choices)
        })}</p>`;
      }
    }

    // Otherwise display as its own paragraph (like for backgrounds)
    return `<p>${game.i18n.getListFormatter().format(topLevel.map(e => e.generateLabel({ modernStyle })))}</p>`;
  }
}


/**
 * Data for a single entry in the equipment list.
 *
 * @property {string} _id                     Unique ID of this entry.
 * @property {string|null} group              Parent entry that contains this one.
 * @property {number} sort                    Sorting order of this entry.
 * @property {string} type                    Entry type as defined in `EquipmentEntryData#TYPES`.
 * @property {number} [count]                 Number of items granted. If empty, assumed to be `1`.
 * @property {string} [key]                   Category or item key unless type is "linked", in which case it is a UUID.
 * @property {boolean} [requiresProficiency]  Is this only a valid item if character already has the
 *                                            required proficiency.
 */
export class EquipmentEntryData extends foundry.abstract.DataModel {

  /**
   * Types that group together child entries.
   * @enum {string}
   */
  static GROUPING_TYPES = {
    OR: "DND5E.StartingEquipment.Operator.OR",
    AND: "DND5E.StartingEquipment.Operator.AND"
  };

  /**
   * Types that contain an option for the player.
   * @enum {string}
   */
  static OPTION_TYPES = {
    // Category types
    armor: "DND5E.StartingEquipment.Choice.Armor",
    tool: "DND5E.StartingEquipment.Choice.Tool",
    weapon: "DND5E.StartingEquipment.Choice.Weapon",
    focus: "DND5E.StartingEquipment.Choice.Focus",

    // Currency
    currency: "DND5E.StartingEquipment.Currency",

    // Generic item type
    linked: "DND5E.StartingEquipment.SpecificItem"
  };

  /**
   * Equipment entry types.
   * @type {Record<string, string>}
   */
  static get TYPES() {
    return { ...this.GROUPING_TYPES, ...this.OPTION_TYPES };
  }

  /* -------------------------------------------- */

  /**
   * Where in `CONFIG.DND5E` to find the type category labels.
   * @enum {{ label: string, config: string }}
   */
  static CATEGORIES = {
    armor: {
      label: "DND5E.Armor",
      config: "armorTypes"
    },
    currency: {
      config: "currencies"
    },
    focus: {
      label: "DND5E.Focus.Label",
      config: "focusTypes"
    },
    tool: {
      label: "TYPES.Item.tool",
      config: "toolTypes"
    },
    weapon: {
      label: "TYPES.Item.weapon",
      config: "weaponProficiencies"
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
      group: new StringField({ nullable: true, initial: null }),
      sort: new IntegerSortField(),
      type: new StringField({ required: true, initial: "OR", choices: this.TYPES }),
      count: new NumberField({ initial: undefined }),
      key: new StringField({ initial: undefined }),
      requiresProficiency: new BooleanField({ label: "DND5E.StartingEquipment.Proficient.Label" })
    };
  }

  /* -------------------------------------------- */

  /**
   * Get any children represented by this entry in order.
   * @returns {EquipmentEntryData[]}
   */
  get children() {
    if ( !(this.type in this.constructor.GROUPING_TYPES) ) return [];
    return this.parent.startingEquipment
      .filter(entry => entry.group === this._id)
      .sort((lhs, rhs) => lhs.sort - rhs.sort);
  }

  /* -------------------------------------------- */

  /**
   * Transform this entry into a human readable label.
   * @type {string}
   */
  get label() {
    return this.generateLabel();
  }

  /* -------------------------------------------- */

  /**
   * Blank label if no key is specified for a choice type.
   * @type {string}
   */
  get blankLabel() {
    return game.i18n.localize(this.constructor.CATEGORIES[this.type]?.label) ?? "";
  }

  /* -------------------------------------------- */

  /**
   * Get the label for a category.
   * @type {string}
   */
  get categoryLabel() {
    const configEntry = this.keyOptions[this.key];
    let label = configEntry?.label ?? configEntry;
    if ( !label ) return this.blankLabel.toLowerCase();

    if ( this.type === "weapon" ) label = game.i18n.format("DND5E.WeaponCategory", { category: label });
    return label.toLowerCase();
  }

  /* -------------------------------------------- */

  /**
   * Build a list of possible key options for this entry's type.
   * @returns {Record<string, string>}
   */
  get keyOptions() {
    const config = foundry.utils.deepClone(CONFIG.DND5E[this.constructor.CATEGORIES[this.type]?.config]);
    if ( this.type === "weapon" ) foundry.utils.mergeObject(config, CONFIG.DND5E.weaponTypes);
    return Object.entries(config).reduce((obj, [k, v]) => {
      obj[k] = foundry.utils.getType(v) === "Object" ? v.label : v;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Transform this entry into a human readable label.
   * @param {object} [options={}]
   * @param {number} [options.depth=1]       Current depth of label being generated.
   * @param {boolean} [options.modernStyle]  Use modern style for OR entries.
   * @type {string}
   */
  generateLabel({ depth=1, modernStyle }={}) {
    let label;
    modernStyle ??= (this.parent.source?.rules === "2024")
      || (!this.parent.source?.rules && (dnd5e.settings.rulesVersion === "modern"));

    switch ( this.type ) {
      // For AND/OR, use a simple conjunction/disjunction list (e.g. "first, second, and third")
      case "AND":
      case "OR":
        let entries = this.children.map(c => c.generateLabel({ depth: depth + 1, modernStyle })).filter(_ => _);
        if ( (this.type === "OR") && (entries.length > 1) ) {
          entries = EquipmentEntryData.prefixOrEntries(entries, { depth, modernStyle });
        }
        return game.i18n.getListFormatter({ type: this.type === "AND" ? "conjunction" : "disjunction", style: "long" })
          .format(entries);

      case "currency":
        const currencyConfig = CONFIG.DND5E.currencies[this.key];
        if ( this.count && currencyConfig ) label = `${this.count} ${currencyConfig.abbreviation.toUpperCase()}`;
        break;

      // For linked type, fetch the name using the index
      case "linked":
        label = linkForUuid(this.key);
        break;

      // For category types, grab category information from config
      default:
        label = this.categoryLabel;
        break;
    }

    if ( !label ) return "";
    if ( this.type === "currency" ) return label;
    if ( this.count > 1 ) label = `${formatNumber(this.count)}&times; ${label}`;
    else if ( this.type !== "linked" ) label = game.i18n.format("DND5E.TraitConfigChooseAnyUncounted", { type: label });
    if ( (this.type === "linked") && this.requiresProficiency ) {
      label += ` (${game.i18n.localize("DND5E.StartingEquipment.IfProficient").toLowerCase()})`;
    }
    return label;
  }

  /* -------------------------------------------- */

  /**
   * Prefix each OR entry at a certain level with a letter.
   * @param {string[]} entries                    Entries to prefix.
   * @param {object} [options={}]
   * @param {number} [options.depth=1]            Current depth of the OR entry (1 or 2).
   * @param {boolean} [options.modernStyle=true]  Capitalized first level markers rather than lowercased.
   * @param {string[]} [options.usedPrefixes]     Prefixes that were used.
   * @returns {string[]}
   */
  static prefixOrEntries(entries, { depth=1, modernStyle=true, usedPrefixes }={}) {
    let letters = game.i18n.localize("DND5E.StartingEquipment.Prefixes");
    if ( !letters ) return entries;
    if ( (modernStyle && (depth === 1)) || (!modernStyle && (depth === 2)) ) letters = letters.toUpperCase();
    return entries.map((e, idx) => {
      if ( usedPrefixes ) usedPrefixes.push(letters[idx]);
      return `(${letters[idx]}) ${e}`;
    });
  }
}
