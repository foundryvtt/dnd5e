/**
 * Override the core method for obtaining a Roll instance used for the Combatant.
 * @see {Actor5e#getInitiativeRoll}
 * @param {string} [formula]  A formula to use if no Actor is defined
 * @returns {D20Roll}         The D20Roll instance which is used to determine initiative for the Combatant
 */
export function getInitiativeRoll(formula="1d20") {
  if ( !this.actor ) return new CONFIG.Dice.D20Roll(formula ?? "1d20", {});
  return this.actor.getInitiativeRoll();
}

/**
 * An extension of the base Combat class to provide some 5e-specific functionality.
 * @extends {Combat}
 */
export default class Combat5e extends Combat {
  /** @inheritdoc */
  async _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    if ( options.direction === 1 ) {
      this.resetLegendaryActions(this.combatant.actor, {whisper: this.combatant.hidden});
    }
  }

  /**
   * Reset the legendary actions of an npc-type actor.
   * @param {Actor5e} actor                       The actor whose actions to reset.
   * @param {object} [options={}]                 Options that modify the update and message.
   * @param {boolean} [options.message=true]      Whether to display a chat message.
   * @param {boolean} [options.whisper=false]     Whether to whisper the message to the owner.
   * @returns {Promise<Actor5e>}                  The actor being updated, if applicable.
   */
  async resetLegendaryActions(actor, {message=true, whisper=false}={}) {
    if ( !actor || !this.active ) return null;
    const leg = actor.system.resources?.legact ?? {};
    const user = game.users.find(u => u.active && actor.testUserPermission(u, "OWNER"));
    if ( (game.user === user) && !!leg.max && (leg.value < leg.max) ) {
      if ( message ) ChatMessage.create({
        content: game.i18n.format("DND5E.LegendaryActionReset", {name: actor.name}),
        speaker: ChatMessage.getSpeaker({actor}),
        whisper: whisper ? [user.id] : []
      });
      return actor.update({"system.resources.legact.value": leg.max});
    }
  }
}
