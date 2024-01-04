import SystemDataModel from "../abstract.mjs";
import EquippableItemTemplate from "./templates/equippable-item.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import PhysicalItemTemplate from "./templates/physical-item.mjs";
import CurrencyTemplate from "../shared/currency.mjs";


/**
 * Data definition for Backpack items.
 * @mixes ItemDescriptionTemplate
 * @mixes PhysicalItemTemplate
 * @mixes EquippableItemTemplate
 * @mixes CurrencyTemplate
 *
 * @property {object} capacity              Information on container's carrying capacity.
 * @property {string} capacity.type         Method for tracking max capacity as defined in `DND5E.itemCapacityTypes`.
 * @property {number} capacity.value        Total amount of the type this container can carry.
 * @property {boolean} capacity.weightless  Does the weight of the items in the container carry over to the actor?
 */
export default class ContainerData extends SystemDataModel.mixin(
  ItemDescriptionTemplate, PhysicalItemTemplate, EquippableItemTemplate, CurrencyTemplate
) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      properties: new foundry.data.fields.SetField(new foundry.data.fields.StringField(), {
        label: "DND5E.ItemContainerProperties"
      }),
      capacity: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({
          required: true, initial: "weight", blank: false, label: "DND5E.ItemContainerCapacityType"
        }),
        value: new foundry.data.fields.NumberField({
          required: true, min: 0, label: "DND5E.ItemContainerCapacityMax"
        })
      }, {label: "DND5E.ItemContainerCapacity"})
    });
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /**
   * Migrate the weightless property into `properties`.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static _migrateWeightlessData(source) {
    if ( foundry.utils.getProperty(source, "system.capacity.weightless") === true ) {
      foundry.utils.setProperty(source, "flags.dnd5e.migratedProperties", ["weightlessContents"]);
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    const system = this;
    Object.defineProperty(this.capacity, "weightless", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `system.capacity.weightless` value on containers has migrated into a property.",
          { since: "DnD5e 2.5", until: "DnD5e 2.7" }
        );
        return system.properties.has("weightlessContents");
      },
      configurable: true
    });
  }
}
