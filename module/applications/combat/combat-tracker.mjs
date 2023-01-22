/**
 * An extension of the base CombatTracker class to provide some 5e-specific functionality.
 * @extends {CombatTracker}
 */
export default class CombatTracker5e extends CombatTracker {
  /** @inheritdoc */
  async _onCombatantControl(event) {
    const btn = event.currentTarget;
    const combatantId = btn.closest(".combatant").dataset.combatantId;
    const combatant = this.viewed.combatants.get(combatantId);
    const advantageKeyboardControl = game.settings.get("dnd5e", "initiativeAdvantageKeyboardControl");
    const advantageMode = advantageKeyboardControl ? (event.altKey ? dnd5e.dice.D20Roll.ADV_MODE.ADVANTAGE
      : event.shiftKey ? dnd5e.dice.D20Roll.ADV_MODE.DISADVANTAGE : dnd5e.dice.D20Roll.ADV_MODE.NORMAL) : null;
    if ( (btn.dataset.control === "rollInitiative") && combatant?.actor ) return combatant.actor.rollInitiativeDialog({advantageMode});
    return super._onCombatantControl(event);
  }
}
