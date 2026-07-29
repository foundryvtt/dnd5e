import DamageMessageData from "./damage-message-data.mjs";

/**
 * @import { HealingMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a healing chat message.
 * @extends {DamageMessageData<HealingMessageSystemData>}
 * @mixes HealingMessageSystemData
 */
export default class HealingMessageData extends DamageMessageData {

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get isHealing() {
    return true;
  }
}
