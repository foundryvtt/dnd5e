import ActiveEffectDataModel from "../abstract/active-effect-data-model.mjs";

const { BooleanField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { baseActiveEffectSystemData } from "./types.mjs";
 */

/**
 * System data model for base active effects.
 * @extends {ActiveEffectDataModel<baseActiveEffectSystemData>}
 * @mixes baseActiveEffectSystemData
 */
export default class baseEffectData extends ActiveEffectDataModel {
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
}
