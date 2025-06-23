import ItemDataModel from "../abstract/item-data-model.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import { staticID } from "../../utils.mjs";
import OrderActivity from "../../documents/activity/order.mjs";

const { ArrayField, BooleanField, DocumentUUIDField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { ItemTypeData } from "./fields/item-type-field.mjs";
 */

/**
 * @typedef FacilityOccupants
 * @property {string[]} value  A list of Actor UUIDs assigned to the facility.
 * @property {number} max      The facility's maximum occupant capacity.
 */

/**
 * The data definition for Facility items.
 * @mixes ActivitiesTemplate
 * @mixes ItemDescriptionTemplate
 *
 * @property {object} building
 * @property {boolean} building.built                Whether the facility has been fully built. Only applicable to basic
 *                                                   facilities.
 * @property {string} building.size                  The target size for the facility to be built at.
 * @property {object} craft
 * @property {string} craft.item                     The Item the facility is currently crafting.
 * @property {number} craft.quantity                 The number of Items being crafted.
 * @property {FacilityOccupants} defenders           The facility's configured defenders.
 * @property {boolean} disabled                      Whether the facility is currently disabled.
 * @property {boolean} enlargeable                   Whether the facility is capable of being enlarged.
 * @property {boolean} free                          Whether the facility counts towards the character's maximum special
 *                                                   facility cap.
 * @property {FacilityOccupants} hirelings           The facility's configured hirelings.
 * @property {number} level                          The minimum level required to build this facility.
 * @property {string} order                          The order type associated with this facility.
 * @property {object} progress
 * @property {number} progress.value                 The number of days' progress made towards completing the order.
 * @property {number} progress.max                   The number of days required to complete the order.
 * @property {string} progress.order                 The order that is currently being executed.
 * @property {string} size                           The size category of the facility.
 * @property {object} trade
 * @property {FacilityOccupants} trade.creatures     The trade facility's stocked creatures.
 * @property {object} trade.pending
 * @property {string[]} trade.pending.creatures      Creatures being bought or sold.
 * @property {"buy"|"sell"} trade.pending.operation  The type of trade operation that was executed this turn.
 * @property {boolean} trade.pending.stocked         The inventory will be fully stocked when the order completes.
 * @property {number} trade.pending.value            The base value transacted during the trade operation this turn.
 * @property {number} trade.profit                   The trade facility's profit factor as a percentage.
 * @property {object} trade.stock
 * @property {boolean} trade.stock.stocked           Whether the facility is fully stocked.
 * @property {number} trade.stock.value              The value of the currently stocked goods.
 * @property {number} trade.stock.max                The maximum value of goods this facility can stock.
 * @property {Omit<ItemTypeData, "baseItem">} type   Facility type & subtype.
 */
export default class FacilityData extends ItemDataModel.mixin(ActivitiesTemplate, ItemDescriptionTemplate) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.FACILITY", "DND5E.SOURCE"];

  /* -------------------------------------------- */

  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      building: new SchemaField({
        built: new BooleanField({ required: true }),
        size: new StringField({ initial: "cramped", blank: false, nullable: false, required: true })
      }),
      craft: new SchemaField({
        item: new DocumentUUIDField({ type: "Item" }),
        quantity: new NumberField({ required: true, integer: true, positive: true, initial: 1, nullable: false })
      }),
      defenders: new SchemaField({
        value: new ArrayField(new DocumentUUIDField({ type: "Actor" })),
        max: new NumberField({ required: true, integer: true, positive: true })
      }),
      disabled: new BooleanField({ required: true }),
      enlargeable: new BooleanField({ required: true }),
      free: new BooleanField({ required: true }),
      hirelings: new SchemaField({
        value: new ArrayField(new DocumentUUIDField({ type: "Actor" })),
        max: new NumberField({ required: true, integer: true, positive: true })
      }),
      level: new NumberField({ required: true, integer: true, positive: true, initial: 5 }),
      order: new StringField({ required: true }),
      progress: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, nullable: false, initial: 0 }),
        max: new NumberField({ required: true, integer: true, positive: true }),
        order: new StringField({ required: true })
      }),
      size: new StringField({ initial: "cramped", blank: false, nullable: false, required: true }),
      trade: new SchemaField({
        creatures: new SchemaField({
          value: new ArrayField(new DocumentUUIDField({ type: "Actor" })),
          max: new NumberField({ required: true, integer: true, positive: true })
        }),
        pending: new SchemaField({
          creatures: new ArrayField(new DocumentUUIDField({ type: "Actor" })),
          operation: new StringField({ required: true, nullable: true, options: ["buy", "sell"], initial: null }),
          stocked: new BooleanField({ required: true }),
          value: new NumberField({ required: true, min: 0, integer: true })
        }),
        profit: new NumberField({ required: true, min: 0, integer: true }),
        stock: new SchemaField({
          stocked: new BooleanField({ required: true }),
          value: new NumberField({ required: true, min: 0, integer: true }),
          max: new NumberField({ required: true, integer: true, positive: true })
        })
      }),
      type: new ItemTypeField({ value: "basic", baseItem: false })
    });
  }

  /* -------------------------------------------- */

  /** @override */
  static get compendiumBrowserFilters() {
    const { basic, special } = CONFIG.DND5E.facilities.advancement;
    const min = Math.min(...Object.keys(basic), ...Object.keys(special));
    return new Map([
      ["level", {
        label: "DND5E.FACILITY.FIELDS.level.label",
        type: "range",
        config: {
          keyPath: "system.level",
          min,
          max: CONFIG.DND5E.maxLevel
        }
      }],
      ["type", {
        label: "DND5E.FACILITY.FIELDS.type.value.label",
        type: "set",
        config: {
          choices: Object.fromEntries(Object.entries(CONFIG.DND5E.facilities.types).map(([k, v]) => [k, v.label])),
          keyPath: "system.type.value"
        }
      }]
    ]);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Create an ephemeral Order activity.
   * @param {string} id     The static ID string for the order. Will have staticID called on it.
   * @param {string} order  The order.
   * @protected
   */
  _createOrderActivity(id, order) {
    const activity = new OrderActivity({
      order,
      _id: staticID(id),
      name: game.i18n.format("DND5E.FACILITY.Order.Issue", {
        order: game.i18n.localize(`DND5E.FACILITY.Orders.${order}.inf`)
      })
    }, { parent: this.parent });
    this.activities.set(activity.id, activity);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    super.prepareBaseData();

    if ( this.type.value === "basic" ) this.enlargeable = this.building.built;
    else this.building.built = true;

    // Activities
    if ( (this.type.value === "special") && this.order ) this._createOrderActivity("dnd5eFacOrder", this.order);
    if ( this.enlargeable ) this._createOrderActivity("dnd5eFacEnlarge", "enlarge");
    if ( !this.building.built ) this._createOrderActivity("dnd5eFacBuild", "build");

    // TODO: Allow order activities to be user-creatable and configurable to avoid having to hard-code this.
    if ( this.type.subtype === "garden" ) this._createOrderActivity("dnd5eFacChange", "change");
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.prepareDescriptionData();

    // Type
    const config = CONFIG.DND5E.facilities.types[this.type.value];
    this.type.label = config?.subtypes?.[this.type.subtype] ?? config?.label;

    // Price
    if ( this.type.value === "basic" ) {
      const { value, days } = CONFIG.DND5E.facilities.sizes[this.size];
      this.price = { value, days, denomination: "gp" };
    }

    // Squares
    this.squares = CONFIG.DND5E.facilities.sizes[this.size].squares;

    // Progress
    if ( this.progress.max ) {
      const { value, max } = this.progress;
      this.progress.value = Math.clamp(value, 0, max);
      this.progress.pct = Math.round((this.progress.value / max) * 100);
    }

    if ( this.disabled ) this.progress.order = "repair";

    // Trade
    if ( Number.isFinite(this.trade.creatures.max) ) {
      this.trade.creatures.max = this._source.trade.creatures.max - this.trade.pending.creatures.length;
    }

    // Labels
    const labels = this.parent.labels ??= {};
    if ( this.order ) labels.order = game.i18n.localize(`DND5E.FACILITY.Orders.${this.order}.present`);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData() {
    this.prepareFinalActivityData(this.parent.getRollData({ deterministic: true }));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.singleDescription = true;
    context.subtitles = [
      { label: this.type.label },
      { label: CONFIG.DND5E.facilities.sizes[this.size].label }
    ];

    context.parts = ["dnd5e.details-facility"];
    context.facilitySubtypes = CONFIG.DND5E.facilities.types[this.type.value]?.subtypes ?? {};
    context.orders = Object.entries(CONFIG.DND5E.facilities.orders).reduce((obj, [value, config]) => {
      const { label, basic, hidden } = config;
      if ( hidden ) return obj;
      // TODO: More hard-coding that we can potentially avoid.
      if ( value === "build" ) {
        if ( !this.building.built ) obj.executable.push({ value, label });
        return obj;
      }
      if ( value === "change" ) {
        if ( this.type.subtype === "garden" ) obj.executable.push({ value, label });
        return obj;
      }
      if ( this.type.value === "basic" ) {
        if ( !this.building.built ) return obj;
        if ( basic ) obj.executable.push({ value, label });
      } else if ( (this.type.value === "special") && !basic ) {
        obj.available.push({ value, label });
        if ( (value === this.order) || (value === "maintain") ) obj.executable.push({ value, label });
      }
      return obj;
    }, { available: [], executable: [] });

    if ( (this.type.value === "special") && ((this.order === "craft") || (this.order === "harvest")) ) {
      context.canCraft = true;
      context.isHarvesting = this.order === "harvest";
      const crafting = await fromUuid(this.craft.item);
      if ( crafting ) context.craft = {
        img: crafting.img,
        name: crafting.name,
        contentLink: crafting.toAnchor().outerHTML
      };
    }
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    const actor = this.parent?.parent;
    if ( !actor ) return;
    const { basic } = CONFIG.DND5E.facilities.advancement;
    const [, available = 0] = Object.entries(basic).reverse()
      .find(([level]) => level <= actor.system.details.level) ?? [];
    const existing = actor.itemTypes.facility.filter(f => f.system.type.value === "basic").length;
    const free = available - existing;
    if ( free > 0 ) this.updateSource({ "building.built": true });
  }
}
