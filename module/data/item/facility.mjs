import { ItemDataModel } from "../abstract.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";

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
 * @property {string} craft                       The Item the facility is currently crafting.
 * @property {FacilityOccupants} defenders        The facility's configured defenders.
 * @property {boolean} free                       Whether the facility counts towards the character's maximum special
 *                                                facility cap.
 * @property {FacilityOccupants} hirelings        The facility's configured hirelings.
 * @property {number} level                       The minimum level required to build this facility.
 * @property {string} order                       The order type associated with this facility.
 * @property {object} progress
 * @property {number} progress.value              The number of days' progress made towards completing the order.
 * @property {number} progress.max                The number of days required to complete the order.
 * @property {string} size                        The size category of the facility.
 * @property {object} trade
 * @property {FacilityOccupants} trade.creatures  The trade facility's stocked creatures.
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
      craft: new DocumentUUIDField({ type: "Item" }),
      defenders: new SchemaField({
        value: new ArrayField(new DocumentUUIDField({ type: "Actor" })),
        max: new NumberField({ required: true, integer: true, positive: true })
      }),
      free: new BooleanField({ required: true }),
      hirelings: new SchemaField({
        value: new ArrayField(new DocumentUUIDField({ type: "Actor" })),
        max: new NumberField({ required: true, integer: true, positive: true })
      }),
      level: new NumberField({ required: true, integer: true, positive: true, initial: 5 }),
      order: new StringField({ required: true, nullable: false, blank: true }),
      progress: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, nullable: false, initial: 0 }),
        max: new NumberField({ required: true, integer: true, positive: true })
      }),
      size: new StringField({ initial: "cramped", blank: false, nullable: false, required: true }),
      trade: new SchemaField({
        creatures: new SchemaField({
          value: new ArrayField(new DocumentUUIDField({ type: "Actor" })),
          max: new NumberField({ required: true, integer: true, positive: true })
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

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.prepareDescriptionData();

    // Type
    const config = CONFIG.DND5E.facilities.types[this.type.value];
    this.type.label = config?.subtypes?.[this.type.subtype] ?? config?.label;

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
      { label: CONFIG.DND5E.facilities.sizes[this.size] }
    ];
    context.parts = ["dnd5e.details-facility"];
  }
}
