import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";

const { BooleanField, DocumentIdField, NumberField } = foundry.data.fields;

/**
 * @import { BastionAttackMessageSystemData } from "./_types.mjs";
 */

/**
 * Custom chat message type used to represent an attack on a bastion.
 * @extends {ChatMessageDataModel<BastionAttackMessageSystemData>}
 * @mixes BastionAttackMessageSystemData
 */
export default class BastionAttackMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      damaged: new DocumentIdField(),
      deaths: new NumberField(),
      resolved: new BooleanField(),
      undefended: new BooleanField()
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    actions: {
      resolve: BastionAttackMessageData.#onResolve
    },
    template: "systems/dnd5e/templates/chat/bastion-attack-summary.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The actor for the chat message.
   * @type {Actor5e}
   */
  get actor() {
    return this.parent.getAssociatedActor();
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const context = {};
    const plurals = new Intl.PluralRules(game.i18n.lang);
    const key = this.undefended ? "Undefended" : this.deaths ? `Deaths.${plurals.select(this.deaths)}` : "NoDeaths";
    context.description = game.i18n.format(`DND5E.Bastion.Attack.Result.${key}`, { deaths: this.deaths });
    context.roll = await this.parent.rolls[0].render();
    context.buttons = [];
    if ( !this.resolved && (this.deaths || this.undefended) ) {
      context.buttons.push({
        label: game.i18n.localize("DND5E.Bastion.Attack.Automatic"),
        icon: '<i class="fa-solid fa-bolt" inert></i>',
        dataset: { action: "resolve" }
      });
    }
    if ( this.damaged ) {
      const facility = this.actor.items.get(this.damaged);
      if ( facility ) context.damaged = game.i18n.format("DND5E.Bastion.Attack.Result.Damaged", {
        link: facility.toAnchor().outerHTML
      });
    }
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle automatically resolving the attack.
   * @this {BastionAttackMessageData}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   * @returns {Promise<ChatMessage5e|void>}
   */
  static async #onResolve(event, target) {
    const { deaths, undefended } = this;
    const actor = this.actor;
    if ( (!deaths && !undefended) || !actor ) return;

    if ( deaths ) {
      const defenders = BastionAttackMessageData.#getDefenders(actor);
      const slain = [];
      for ( let i = 0; i < deaths; i++ ) {
        if ( !defenders.length ) break;
        const roll = await Roll.create(`1d${defenders.length}`).evaluate({ allowInteractive: false });
        const [defender] = defenders.splice(roll.total - 1, 1);
        slain.push(defender);
      }
      const updates = {};
      for ( const { facility, uuid } of slain ) {
        if ( !updates[facility.id] ) updates[facility.id] = [...facility.system.defenders.value];
        updates[facility.id].findSplice(a => a === uuid);
      }
      await actor.updateEmbeddedDocuments("Item", Object.entries(updates).map(([_id, value]) => {
        return { _id, "system.defenders.value": value };
      }));
    }

    let damaged;
    const defenders = BastionAttackMessageData.#getDefenders(actor);
    if ( !defenders.length ) {
      const special = actor.itemTypes.facility.filter(f => (f.system.type.value === "special") && !f.system.disabled);
      if ( special.length ) {
        const roll = await Roll.create(`1d${special.length}`).evaluate({ allowInteractive: false });
        damaged = special[roll.total - 1];
        await damaged?.update({ "system.disabled": true });
      }
    }

    return this.parent.update({ system: { damaged: damaged?.id ?? null, resolved: true } });
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Resolve a bastion attack against a given Actor's bastion.
   * @param {Actor5e} actor                    The Actor.
   * @param {string} formula                   The attack formula.
   * @param {object} [options]
   * @param {boolean} [options.summary=true]   Print a chat message summary of the attack.
   * @param {number} [options.threshold=1]     The maximum number on a die roll that is considered a defender death.
   * @returns {Promise<ChatMessage5e|Partial<BastionAttackMessageSystemData>>}  Created message or message data.
   */
  static async handleAttack(actor, formula, { summary=true, threshold=1 }={}) {
    const results = {};
    const roll = await Roll.create(formula).evaluate();
    const deaths = roll.dice.reduce((count, die) => {
      return count + die.results.filter(({ result, active }) => active && (result <= threshold)).length;
    }, 0);
    const defenders = this.#getDefenders(actor);
    if ( defenders.length ) results.deaths = Math.min(deaths, defenders.length);
    else results.undefended = true;
    let message;
    if ( summary ) message = await ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor }),
      rolls: [roll],
      system: results,
      type: "bastionAttack"
    });
    return message ?? results;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve a list of defenders for the given Actor's bastion.
   * @param {Actor5e} actor  The actor.
   * @returns {{ facility: Item5e, uuid: string }[]}
   */
  static #getDefenders(actor) {
    const allDefenders = [];
    for ( const facility of actor.itemTypes.facility ) {
      const { defenders, type } = facility.system;
      if ( (type.value === "special") && defenders.max ) {
        allDefenders.push(...defenders.value.map(uuid => ({ facility, uuid })));
      }
    }
    return allDefenders;
  }

}
