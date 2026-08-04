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

  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ability: new StringField({ blank: false, required: false }),
      deltas: new ActorDeltasField(),
      outcome: new StringField({
        blank: false, choices: ["broken", "death", "revive", "stable"], initial: null, nullable: true, required: false
      }),
      resisted: new BooleanField(),
      type: new StringField({ blank: false, choices: ["ability", "concentration", "death"], initial: "ability" })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    actions: {
      breakConcentration: SaveMessageData.#breakConcentration,
      resistSave: SaveMessageData.#resistSave
    },
    template: "systems/dnd5e/templates/chat/save-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */

  /** @inheritDoc */
  static validateJoint(data) {
    super.validateJoint(data);
    if ( (data.type !== "death") && !data.ability ) {
      throw new Error("A saving throw message requires an ability unless it is a death saving throw.");
    }
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Whether the concentrating actor can lose concentration as a result of this failed save.
   * @type {boolean}
   */
  get canBreakConcentration() {
    const actor = this.parent.getAssociatedActor();
    return (this.type === "concentration") && !this.concentrationBroken && !!actor?.isOwner
      && !dnd5e.settings.disableConcentration && this.parent.rolls.some(r => r.isFailure) && !this.forceSuccess;
  }

  /* -------------------------------------------- */

  /**
   * Whether the saving throw maker can use a legendary resistance to turn a failure into a success.
   * @type {boolean}
   */
  get canResist() {
    const actor = this.parent.getAssociatedActor();
    return !!actor?.system.isNPC && actor.isOwner && !this.resisted && !this.concentrationBroken
      && this.parent.rolls.some(r => r.isFailure) && !!actor.system.resources.legres.value;
  }

  /* -------------------------------------------- */

  /** @override */
  get canCrit() {
    return this.type === "death";
  }

  /* -------------------------------------------- */

  /**
   * Whether concentration has been broken as a result of this save.
   * @type {boolean}
   */
  get concentrationBroken() {
    return this.outcome === "broken";
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
    const { canBreakConcentration, canResist, concentrationBroken, resisted } = this;
    const actor = this.parent.getAssociatedActor();
    Object.assign(context, { canBreakConcentration, canResist, concentrationBroken, resisted });
    context.death = this.type === "death";
    if ( actor ) {
      // Filter out success & failure tallies since their real data changes might read as confusing.
      const deltas = {
        ...this.deltas, actor: this.deltas.actor.filter(d => !d.keyPath.startsWith("system.attributes.death."))
      };
      context.deltas = ActorDeltasField.processDeltas.call(deltas, actor, this.parent.rolls);
    }
    if ( context.death && this.outcome ) context.outcome = _loc(`DND5E.DEATH.Outcome.${this.outcome}`, {
      name: actor?.name ?? ""
    });
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Break concentration as a result of this failed concentration save.
   * @this {SaveMessageData}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #breakConcentration(event, target) {
    target.disabled = true;
    const ended = await this.parent.getAssociatedActor()?.endConcentration();
    if ( ended?.length ) await this.parent.update({ "system.outcome": "broken" });
    else target.disabled = false;
  }

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
