import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import ActivationsField from "./fields/activations-field.mjs";
import { ActorDeltasField } from "./fields/deltas-field.mjs";

const { DocumentIdField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { TurnMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a combat turn chat message.
 * @extends ChatMessageDataModel<TurnMessageSystemData>
 * @mixes TurnMessageSystemData
 */
export default class TurnMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      activations: new ActivationsField(),
      deltas: new ActorDeltasField(),
      origin: new SchemaField({
        combat: new DocumentIdField({ nullable: false, required: true }),
        combatant: new DocumentIdField({ nullable: false, required: true })
      }),
      trigger: new SetField(new StringField())
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/turn-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The actor belonging to the combatant.
   * @type {Actor5e}
   */
  get actor() {
    return this.combatant?.actor ?? this.parent.getAssociatedActor();
  }

  /* -------------------------------------------- */

  /**
   * The combat during which this message was triggered.
   * @type {Combat5e}
   */
  get combat() {
    return game.combats.get(this.origin.combat);
  }

  /* -------------------------------------------- */

  /**
   * The combatant to whom this message applies.
   * @type {Combatant5e}
   */
  get combatant() {
    return this.combat?.combatants.get(this.origin.combatant);
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {
      actor: this.actor,
      combat: this.combat,
      combatant: this.combatant
    };

    if ( context.actor?.isOwner ) {
      context.activities = ActivationsField.processActivations.call(this.activations, this.actor);
      context.deltas = ActorDeltasField.processDeltas.call(this.deltas, this.actor, this.parent.rolls);
    }

    return context;
  }
}
