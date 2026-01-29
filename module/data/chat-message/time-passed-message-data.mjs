import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import ActivationsField from "./fields/activations-field.mjs";
import { IndividualDeltaField } from "./fields/deltas-field.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;
const { ArrayField, DocumentUUIDField, SchemaField } = foundry.data.fields;

/**
 * @import { IndividualDeltaData } from "./fields/deltas-field.mjs";
 */

/**
 * @typedef DocumentDeltasData
 * @param {IndividualDeltaData} deltas  Data deltas for an document update.
 * @param {string} uuid                 UUID of the document to which the deltas apply.
 */

/**
 * Data stored in a time passed chat message.
 *
 * @property {DocumentDeltasData[]} changes  Item recovery from this time change.
 */
export default class TimePassedMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      changes: new ArrayField(new SchemaField({
        deltas: new ArrayField(new IndividualDeltaField()),
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
      const doc = fromUuidSync(uuid, { strict: false });
      if ( !doc?.testUserPermission(game.user, "OBSERVER") ) continue;
      for ( const delta of deltas ) {
        context.deltas.push(IndividualDeltaField.processDelta.call(
          delta, doc, this.parent.rolls
            .filter(r => (r.options.delta?.itemUuid === doc.uuid) && (r.options.delta?.keyPath === delta.keyPath))
        ));
      }
    }

    return context;
  }
}
