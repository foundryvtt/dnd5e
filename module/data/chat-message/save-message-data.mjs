import { ActorDeltasField } from "./fields/deltas-field.mjs";
import RollMessageData from "./roll-message-data.mjs";

const { BooleanField, StringField } = foundry.data.fields;

/**
 * @import { SaveMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a saving throw chat message.
 * @extends {RollMessageData<SaveMessageSystemData>}
 * @mixes SaveMessageSystemData
 */
export default class SaveMessageData extends RollMessageData {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ability: new StringField({ blank: false, required: true }),
      deltas: new ActorDeltasField(),
      outcome: new StringField({
        blank: false, choices: ["death", "revive", "stable"], initial: null, nullable: true, required: false
      }),
      resisted: new BooleanField()
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    actions: {
      resistSave: SaveMessageData.#resistSave
    },
    template: "systems/dnd5e/templates/chat/save-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Whether the saving throw maker can use a legendary resistance to turn a failure into a success.
   * @type {boolean}
   */
  get canResist() {
    const actor = this.parent.getAssociatedActor();
    return !!actor?.system.isNPC && actor.isOwner && !this.resisted
      && this.parent.rolls.some(r => r.isFailure) && !!actor.system.resources.legres.value;
  }

  /* -------------------------------------------- */

  /** @override */
  get canCrit() {
    return this.ability === "death";
  }

  /* -------------------------------------------- */

  /** @override */
  get forceSuccess() {
    return this.resisted;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const { canResist, resisted } = this;
    const actor = this.parent.getAssociatedActor();
    Object.assign(context, { canResist, resisted });
    context.death = this.ability === "death";
    if ( actor ) {
      context.deltas = ActorDeltasField.processDeltas.call(this.deltas, actor, this.parent.rolls);
      context.deltasHeading = "DND5E.DeathSave";
    }
    if ( this.outcome ) context.outcome = game.i18n.format(`DND5E.DEATH.Outcome.${this.outcome}`, {
      name: actor?.name ?? ""
    });
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Spend a legendary resistance to turn this failed save into a success.
   * @this {SaveMessageData}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #resistSave(event, target) {
    target.disabled = true;
    try {
      await this.parent.getAssociatedActor()?.system.resistSave(this.parent);
    } finally {
      target.disabled = false;
    }
  }
}
