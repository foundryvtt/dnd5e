import { formatNumber, linkForUuid } from "../../../utils.mjs";
import SystemDataModel from "../../abstract/system-data-model.mjs";
import { FormulaField } from "../../fields/_module.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, EmbeddedDataField, IntegerSortField, NumberField, StringField
} = foundry.data.fields;

/**
 * Data model template representing a background & class's starting equipment.
 *
 * @property {EquipmentEntryData[]} startingEquipment  Different equipment entries that will be granted.
 * @property {string} wealth                           Formula used to determine starting wealth.
 */
export default class StartingEquipmentTemplate extends SystemDataModel {
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
    const topLevel = this.startingEquipment.filter(e => !e.group);
    if ( !topLevel.length ) return "";

    // If more than one entry, display as an unordered list (like for classes)
    if ( topLevel.length > 1 ) return `<ul>${topLevel.map(e => `<li>${e.label}</li>`).join("")}</ul>`;

    // Otherwise display as its own paragraph (like for backgrounds)
    return `<p>${game.i18n.getListFormatter().format(topLevel.map(e => e.label))}</p>`;
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
      _id: new DocumentIdField({initial: () => foundry.utils.randomID()}),
      group: new StringField({nullable: true, initial: null}),
      sort: new IntegerSortField(),
      type: new StringField({required: true, initial: "OR", choices: this.TYPES}),
      count: new NumberField({initial: undefined}),
      key: new StringField({initial: undefined}),
      requiresProficiency: new BooleanField({label: "DND5E.StartingEquipment.Proficient.Label"})
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
    let label;

    switch ( this.type ) {
      // For AND/OR, use a simple conjunction/disjunction list (e.g. "first, second, and third")
      case "AND":
      case "OR":
        return game.i18n.getListFormatter({type: this.type === "AND" ? "conjunction" : "disjunction", style: "long"})
          .format(this.children.map(c => c.label).filter(l => l));

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
    if ( this.count > 1 ) label = `${formatNumber(this.count)}&times; ${label}`;
    else if ( this.type !== "linked" ) label = game.i18n.format("DND5E.TraitConfigChooseAnyUncounted", { type: label });
    if ( (this.type === "linked") && this.requiresProficiency ) {
      label += ` (${game.i18n.localize("DND5E.StartingEquipment.IfProficient").toLowerCase()})`;
    }
    return label;
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
}
