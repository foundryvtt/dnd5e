import D20Roll from "../../dice/d20-roll.mjs";

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
    const rollOptions = game.settings.get("dnd5e", "initiativeAdvantageKeyboardControl") ? D20Roll.determineAdvantageMode({event: event, advantage: false, disadvantage: false, fastForward: false}) : {};
    if ( (btn.dataset.control === "rollInitiative") && combatant?.actor ) return combatant.actor.rollInitiativeDialog(rollOptions);
    return super._onCombatantControl(event);
  }
}
