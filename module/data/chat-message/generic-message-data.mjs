import RollMessageData from "./roll-message-data.mjs";

/**
 * @import { GenericMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a generic roll chat message.
 * @extends {RollMessageData<GenericMessageSystemData>}
 * @mixes GenericMessageSystemData
 */
export default class GenericMessageData extends RollMessageData {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/generic-card.hbs"
  }, { inplace: false }));
}
