const { BooleanField, NumberField } = foundry.data.fields;

/**
 * @import { BastionSettingData } from "./_types.mjs";
 */

/**
 * A data model that represents the Bastion configuration options.
 * @extends {foundry.abstract.DataModel<BastionSettingData>}
 * @mixes BastionSettingData
 */
export default class BastionSetting extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      button: new BooleanField({
        required: true, label: "DND5E.Bastion.Button.Label", hint: "DND5E.Bastion.Button.Hint"
      }),
      duration: new NumberField({
        required: true, positive: true, integer: true, initial: 7, label: "DND5E.Bastion.Duration.Label"
      }),
      enabled: new BooleanField({
        required: true, label: "DND5E.Bastion.Enabled.Label", hint: "DND5E.Bastion.Enabled.Hint"
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Cached version of the minimum level required to have a bastion.
   * @param {number}
   */
  static #threshold;

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Determine whether bastions are available for a specific actor.
   * @param {Actor5e} actor  Actor that may have a bastion.
   * @returns {boolean}
   */
  availableForActor(actor) {
    if ( !BastionSetting.#threshold ) {
      const { basic, special } = CONFIG.DND5E.facilities.advancement;
      BastionSetting.#threshold = Math.min(...Object.keys(basic), ...Object.keys(special));
    }
    return this.enabled && (actor.system.details?.level >= BastionSetting.#threshold);
  }
}
