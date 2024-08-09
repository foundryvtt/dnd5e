import { formatNumber } from "../../utils.mjs";

/**
 * An extension of the base CombatTracker class to provide some 5e-specific functionality.
 * @extends {CombatTracker}
 */
export default class CombatTracker5e extends CombatTracker {
  async getData(options={}) {
    const context = await super.getData(options);
    context.turns.forEach(turn => {
      turn.initiative = formatNumber(Number(turn.initiative), { maximumFractionDigits: 0 });
    });
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onCombatantControl(event) {
    const btn = event.currentTarget;
    const combatantId = btn.closest(".combatant").dataset.combatantId;
    const combatant = this.viewed.combatants.get(combatantId);
    if ( (btn.dataset.control === "rollInitiative") && combatant?.actor ) return combatant.actor.rollInitiativeDialog();
    return super._onCombatantControl(event);
  }
}
