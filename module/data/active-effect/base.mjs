import ActiveEffectDataModel from "../abstract/active-effect-data-model.mjs";
import FiltersField from "../fields/filters-field.mjs";

const { BooleanField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { BaseActiveEffectSystemData } from "./types.mjs";
 */

/**
 * System data model for base active effects.
 * @extends {ActiveEffectDataModel<BaseActiveEffectSystemData>}
 * @mixes BaseActiveEffectSystemData
 */
export default class BaseEffectData extends ActiveEffectDataModel {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.EFFECT.BASE", "DND5E.EFFECT.RIDER"];

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      conditions: new FiltersField(),
      magical: new BooleanField(),
      rider: new SchemaField({
        statuses: new SetField(new StringField())
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get applicableType() {
    return this.isRider ? "" : "Actor";
  }

  /* -------------------------------------------- */

  /**
   * Is this effect a rider for a non-applied enchantment?
   * @type {boolean}
   */
  get isRider() {
    return this.item?.getFlag("dnd5e", "riders.effect")?.includes(this.parent.id) ?? false;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @override */
  async getSheetData(context) {
    context.additionalChangesFields.unshift({
      field: context.systemFields.rider.fields.statuses,
      options: CONFIG.statusEffects.map(se => ({ value: se.id, label: se.name })),
      value: context.source.system.rider.statuses
    });
  }
}
