import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import { ActorDeltasField } from "./fields/deltas-field.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;
const { ArrayField, DocumentUUIDField, SchemaField } = foundry.data.fields;

/**
 * @import { TimePassedMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a time passed chat message.
 * @extends {ChatMessageDataModel<TimePassedMessageSystemData>}
 * @mixes TimePassedMessageSystemData
 */
export default class TimePassedMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      changes: new ArrayField(new SchemaField({
        deltas: new ActorDeltasField(),
        uuid: new DocumentUUIDField()
      }))
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/time-passed-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const context = {
      content: await TextEditor.enrichHTML(this.parent.content, { rollData: this.parent.getRollData() }),
      deltas: []
    };

    for ( const { deltas, uuid } of this.changes ) {
      const actor = fromUuidSync(uuid, { strict: false });
      if ( !actor?.testUserPermission(game.user, "OBSERVER") ) continue;
      context.deltas.push(...ActorDeltasField.processDeltas.call(deltas, actor, this.parent.rolls));
    }

    return context;
  }
}
