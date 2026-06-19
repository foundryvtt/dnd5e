import { formatTime } from "../../utils.mjs";
import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import CalendarData5e from "../calendar/calendar-data.mjs";
import { ActorDeltasField } from "./fields/deltas-field.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;
const { ArrayField, BooleanField, DocumentUUIDField, NumberField, SchemaField } = foundry.data.fields;

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
      bastion: new SchemaField({
        reminder: new BooleanField(),
        triggered: new BooleanField()
      }, { required: false, initial: undefined }),
      changes: new ArrayField(new SchemaField({
        deltas: new ActorDeltasField(),
        uuid: new DocumentUUIDField()
      })),
      time: new NumberField({ initial: () => game.time.worldTime })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    actions: {
      bastionTurn: TimePassedMessageData.#onBastionTurn
    },
    template: "systems/dnd5e/templates/chat/time-passed-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  _getEnrichmentOptions() {
    return { avatar: false };
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const context = {
      bastion: { ...this.bastion },
      content: await TextEditor.enrichHTML(this.parent.content, { rollData: this.parent.getRollData() }),
      deltas: []
    };

    if ( this.bastion?.reminder && game.user.isGM ) {
      if ( this.bastion.triggered ) {
        context.bastion.message = _loc("DND5E.Bastion.Reminder.Triggered");
      } else {
        const lastBastionTurn = dnd5e.settings.bastionTurns.at(-1);
        const days = lastBastionTurn !== undefined ? CalendarData5e.dayDifference(
          game.time.calendar.timeToComponents(lastBastionTurn),
          game.time.calendar.timeToComponents(this.time)
        ) : Infinity;
        if ( days > 0 ) context.bastion.message = _loc(
          `DND5E.Bastion.Reminder.${Number.isFinite(days) ? "Ellapsed" : "Unknown"}`,
          { time: formatTime(days, "day") }
        );
      }
    }

    for ( const { deltas, uuid } of this.changes ) {
      const actor = fromUuidSync(uuid, { strict: false });
      if ( !actor?.testUserPermission(game.user, "OBSERVER") ) continue;
      context.deltas.push(...ActorDeltasField.processDeltas.call(deltas, actor, this.parent.rolls));
    }

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(element, options={}) {
    super._onRender(element, options);
    element.classList.add("compact");
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle advancing a bastion turn.
   * @this {TimePassedMessageData}
   * @type {ApplicationClickAction}
   */
  static async #onBastionTurn(event, target) {
    if ( await dnd5e.bastion.confirmAdvance() === false ) return;
    this.parent.update({ "system.bastion.triggered": true });
  }
}
