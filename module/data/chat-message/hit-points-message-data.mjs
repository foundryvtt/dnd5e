import RollMessageData from "./roll-message-data.mjs";

/**
 * @import { HitPointsMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a hit points roll chat message.
 * @extends {RollMessageData<HitPointsMessageSystemData>}
 * @mixes HitPointsMessageSystemData
 */
export default class HitPointsMessageData extends RollMessageData {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/hit-points-card.hbs"
  }, { inplace: false }));
}
