import Actor5e from "../../documents/actor/actor.mjs";
import { defaultUnits, formatLength, splitSemicolons } from "../../utils.mjs";
import { ItemDataModel } from "../abstract.mjs";
import AdvancementField from "../fields/advancement-field.mjs";
import { CreatureTypeField, MovementField, SensesField } from "../shared/_module.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

const { ArrayField } = foundry.data.fields;

/**
 * Data definition for Race items.
 * @mixes ItemDescriptionTemplate
 *
 * @property {object[]} advancement    Advancement objects for this race.
 * @property {MovementField} movement
 * @property {SensesField} senses
 * @property {CreatureType} type
 */
export default class RaceData extends ItemDataModel.mixin(ItemDescriptionTemplate) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.SOURCE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      advancement: new ArrayField(new AdvancementField(), { label: "DND5E.AdvancementTitle" }),
      movement: new MovementField({}, { initialUnits: defaultUnits("length") }),
      senses: new SensesField({}, { initialUnits: defaultUnits("length") }),
      type: new CreatureTypeField({ swarm: false }, { initial: { value: "humanoid" } })
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    singleton: true
  }, {inplace: false}));

  /* -------------------------------------------- */

  /** @override */
  static get compendiumBrowserFilters() {
    return new Map([
      ["hasDarkvision", {
        label: "DND5E.CompendiumBrowser.Filters.HasDarkvision",
        type: "boolean",
        createFilter: (filters, value, def) => {
          if ( value === 0 ) return;
          const filter = { k: "system.senses.darkvision", o: "gt", v: 0 };
          if ( value === 1 ) filters.push(filter);
          else filters.push({ o: "NOT", v: filter });
        }
      }]
    ]);
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Sheet labels for a race's movement.
   * @returns {Object<string>}
   */
  get movementLabels() {
    const units = this.movement.units || defaultUnits("length");
    return Object.entries(CONFIG.DND5E.movementTypes).reduce((obj, [k, label]) => {
      const value = this.movement[k];
      if ( value ) obj[k] = `${label} ${formatLength(value, units)}`;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Sheet labels for a race's senses.
   * @returns {Object<string>}
   */
  get sensesLabels() {
    const units = this.senses.units || defaultUnits("length");
    return Object.entries(CONFIG.DND5E.senses).reduce((arr, [k, label]) => {
      const value = this.senses[k];
      if ( value ) arr.push(`${label} ${formatLength(value, units)}`);
      return arr;
    }, []).concat(splitSemicolons(this.senses.special));
  }

  /* -------------------------------------------- */

  /**
   * Sheet label for a race's creature type.
   * @returns {Object<string>}
   */
  get typeLabel() {
    return Actor5e.formatCreatureType(this.type);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.prepareDescriptionData();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [{ label: context.itemType }];
    context.singleDescription = true;
    context.info = [{
      label: "DND5E.CreatureType",
      classes: "info-sm",
      value: this.typeLabel,
      config: "type",
      tooltip: "DND5E.CreatureTypeTitle"
    },
    {
      label: "DND5E.Movement",
      classes: "info-sm info-grid",
      config: "movement",
      tooltip: "DND5E.MovementConfig",
      value: Object.entries(CONFIG.DND5E.movementTypes).reduce((str, [k, label]) => {
        const value = this.movement[k];
        if ( !value ) return str;
        return `${str}
          <span class="key">${label}</span>
          <span class="value">${value}</span>
        `;
      }, "")
    },
    {
      label: "DND5E.Senses",
      classes: "info-sm info-grid",
      config: "senses",
      tooltip: "DND5E.SensesConfig",
      value: Object.entries(CONFIG.DND5E.senses).reduce((str, [k, label]) => {
        const value = this.senses[k];
        if ( !value ) return str;
        return `${str}
          <span class="key">${label}</span>
          <span class="value">${value}</span>
        `;
      }, "")
    }];
    context.parts = ["dnd5e.details-species"];
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    if ( data._id || foundry.utils.hasProperty(data, "system.advancement") ) return;

    const toCreate = [
      { type: "AbilityScoreImprovement" }, { type: "Size" },
      { type: "Trait", configuration: { grants: ["languages:standard:common"] } }
    ];
    this.parent.updateSource({"system.advancement": toCreate.map(c => {
      const config = CONFIG.DND5E.advancementTypes[c.type];
      const cls = config.documentClass ?? config;
      return new cls(c, { parent: this.parent }).toObject();
    })});
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if ( (game.user.id !== userId) || !["character", "npc"].includes(this.parent.actor?.type) ) return;
    this.parent.actor.update({ "system.details.race": this.parent.id });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preDelete(options, user) {
    if ( (await super._preDelete(options, user)) === false ) return false;
    if ( !["character", "npc"].includes(this.parent.actor?.type) ) return;
    await this.parent.actor.update({ "system.details.race": null });
  }
}
