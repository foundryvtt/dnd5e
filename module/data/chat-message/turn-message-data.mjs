import { formatNumber, getHumanReadableAttributeLabel } from "../../utils.mjs";
import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import { ActorDeltasField } from "./fields/deltas-field.mjs";

const { DocumentIdField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { ActorDeltasData } from "./fields/deltas-field.mjs";
 */

/**
 * Data stored in a combat turn chat message.
 *
 * @property {Set<string>} activations  Activities that can be used with these periods, stored as relative UUIDs.
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
      activations: new SetField(new StringField()),
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
    actions: {
      use: TurnMessageData.#useActivity
    },
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
    if ( !context.actor ) return context;

    if ( context.actor.isOwner ) context.activities = Array.from(this.activations)
      .map(uuid => fromUuidSync(uuid, { relative: context.actor, strict: false }))
      .filter(_ => _)
      .sort((lhs, rhs) => (lhs.item.sort - rhs.item.sort) || (lhs.sort - rhs.sort));

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
      ...Object.entries(this.deltas.item).flatMap(([id, deltas]) =>
        deltas.map(d => processDelta(this.actor.items.get(id), d))
      )
    ];
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  _onRender(element) {
    for ( const e of element.querySelectorAll(".item-tooltip") ) {
      const uuid = e.closest("[data-item-uuid]")?.dataset.itemUuid;
      if ( !uuid ) continue;
      Object.assign(e.dataset, {
        tooltip: `<section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>`,
        tooltipClass: "dnd5e2 dnd5e-tooltip item-tooltip",
        tooltipDirection: "LEFT"
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle using an activity.
   * @this {TurnMessageData}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #useActivity(event, target) {
    target.disabled = true;
    try {
      const activity = await fromUuid(target.closest("[data-activity-uuid]")?.dataset.activityUuid);
      await activity?.use({ event });
    } finally {
      target.disabled = false;
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Find any activity relative UUIDs on this actor that can be used during a set of combat periods.
   * @param {Actor5e} actor
   * @param {string[]} periods
   * @returns {Set<string>}
   */
  static getActivations(actor, periods) {
    return actor.items
      .map(i => i.system.activities?.filter(a => periods.includes(a.activation?.type)).map(a => a.relativeUUID) ?? [])
      .flat();
  }
}
