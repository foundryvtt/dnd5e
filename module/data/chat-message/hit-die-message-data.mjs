import RollMessageData from "./roll-message-data.mjs";

/**
 * @import { HitDieMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a hit die roll chat message.
 * @extends {RollMessageData<HitDieMessageSystemData>}
 * @mixes HitDieMessageSystemData
 */
export default class HitDieMessageData extends RollMessageData {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/hit-die-card.hbs"
  }, { inplace: false }));
}
