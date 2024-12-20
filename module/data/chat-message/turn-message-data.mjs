import { formatNumber, getHumanReadableAttributeLabel } from "../../utils.mjs";
import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import ActorDeltasField from "./fields/deltas-field.mjs";

const { DocumentIdField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @typedef {import("./fields/deltas-field.mjs").ActorDeltasData} ActorDeltasData
 */

/**
 * Data stored in a combat turn chat message.
 *
 * @property {ActorDeltasData} deltas   Actor/item recovery from this turn change.
 * @property {object} origin
 * @property {string} origin.combat     ID of the triggering combat.
 * @property {string} origin.combatant  ID of the relevant combatant within the combat.
 * @property {Set<string>} periods      Combat state change that triggered this message.
 */
export default class TurnMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
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
    return this.combatant?.actor;
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
  async _prepareContext() {
    const context = {
      actor: this.actor,
      combat: this.combat,
      combatant: this.combatant
    };
    if ( !context.actor ) return context;

    const processDelta = (doc, delta) => {
      const type = doc instanceof Actor ? "actor" : "item";
      return {
        type,
        delta: formatNumber(delta.delta, { signDisplay: "always" }),
        document: doc,
        label: getHumanReadableAttributeLabel(delta.keyPath, { [type]: doc }) ?? delta.keyPath
        // TODO: If any rolls were performed for recovery, associate with delta
      };
    };

    context.deltas = [
      ...this.deltas.actor.map(d => processDelta(this.actor, d)),
      ...Object.entries(this.deltas.item).map(([id, deltas]) =>
        deltas.map(d => processDelta(this.actor.items.get(id), d))
      ).flat()
    ];
    return context;
  }
}
