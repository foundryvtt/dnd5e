import { ItemDataModel } from "../abstract.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import { staticID } from "../../utils.mjs";
import OrderActivity from "../../documents/activity/order.mjs";

const { ArrayField, BooleanField, DocumentUUIDField, NumberField, SchemaField, StringField } = foundry.data.fields;

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
 * @property {object} craft
 * @property {string} craft.item                  The Item the facility is currently crafting.
 * @property {number} craft.quantity              The number of Items being crafted.
 * @property {FacilityOccupants} defenders        The facility's configured defenders.
 * @property {boolean} enlargeable                Whether the facility is capable of being enlarged.
 * @property {boolean} free                       Whether the facility counts towards the character's maximum special
 *                                                facility cap.
 * @property {FacilityOccupants} hirelings        The facility's configured hirelings.
 * @property {number} level                       The minimum level required to build this facility.
 * @property {string} order                       The order type associated with this facility.
 * @property {object} progress
 * @property {number} progress.value              The number of days' progress made towards completing the order.
 * @property {number} progress.max                The number of days required to complete the order.
 * @property {string} progress.order              The order that is currently being executed.
 * @property {string} size                        The size category of the facility.
 * @property {object} trade
 * @property {FacilityOccupants} trade.creatures  The trade facility's stocked creatures.
 * @property {object} trade.pending
 * @property {string[]} trade.pending.creatures   Creatures being bought or sold.
 * @property {"buy"|"sell"} trade.pending.operation  The type of trade operation that was executed this turn.
 * @property {boolean} trade.pending.stocked      Whether the inventory will be fully stocked when the order completes.
 * @property {number} trade.pending.value         The base value transacted during the trade operation this turn.
 * @property {number} trade.profit                The trade facility's profit factor as a percentage.
 * @property {object} trade.stock
 * @property {boolean} trade.stock.stocked        Whether the facility is fully stocked.
 * @property {number} trade.stock.value           The value of the currently stocked goods.
 * @property {number} trade.stock.max             The maximum value of goods this facility can stock.
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
      craft: new SchemaField({
        // TODO: Add type constraint when v12 support is dropped.
        item: new DocumentUUIDField(),
        quantity: new NumberField({ required: true, integer: true, positive: true, initial: 1, nullable: false })
      }),
      defenders: new SchemaField({
        value: new ArrayField(new DocumentUUIDField({ type: "Actor" })),
        max: new NumberField({ required: true, integer: true, positive: true })
      }),
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
          value: new ArrayField(new DocumentUUIDField()),
          max: new NumberField({ required: true, integer: true, positive: true })
        }),
        pending: new SchemaField({
          creatures: new ArrayField(new DocumentUUIDField()),
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

    if ( this.type.value === "basic" ) this.enlargeable = true;
    if ( this.size === "vast" ) this.enlargeable = false;

    // Activities
    if ( this.type.value === "special" ) this._createOrderActivity("dnd5eFacOrder", this.order);
    if ( this.enlargeable ) this._createOrderActivity("dnd5eFacEnlarge", "enlarge");
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
    context.facilitySubtypes = CONFIG.DND5E.facilities.types[this.type.value]?.subtypes ?? {};
    context.singleDescription = true;
    context.subtitles = [
      { label: this.type.label },
      { label: CONFIG.DND5E.facilities.sizes[this.size].label }
    ];
    context.parts = ["dnd5e.details-facility"];
  }
}
