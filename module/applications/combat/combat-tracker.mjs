import ContextMenu5e from "../context-menu.mjs";
import { formatNumber, getPluralRules } from "../../utils.mjs";

/**
 * @typedef {object} CombatGroupData
 * @property {boolean} expanded
 */

/**
 * An extension of the base CombatTracker class to provide some 5e-specific functionality.
 * @extends {CombatTracker}
 */
export default class CombatTracker5e extends (foundry.applications?.sidebar?.tabs?.CombatTracker ?? CombatTracker) {

  /** @inheritDoc */
  async getData(options={}) {
    const context = await super.getData(options);
    context.turns.forEach(turn => {
      turn.initiative = formatNumber(Number(turn.initiative), { maximumFractionDigits: 0 });
    });
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareTrackerContext(context, options) {
    await super._prepareTrackerContext(context, options);
    context.turns?.forEach(turn => {
      if ( Number.isFinite(turn.initiative) ) {
        turn.initiative = formatNumber(Number(turn.initiative), { maximumFractionDigits: 0 });
      }
    });
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onCombatantControl(event, target) {
    const btn = target || event.currentTarget;
    const combatantId = btn.closest(".combatant").dataset.combatantId;
    const combatant = this.viewed.combatants.get(combatantId);
    const action = btn.dataset.control || btn.dataset.action;
    if ( (action === "rollInitiative") && combatant?.actor ) return combatant.actor.rollInitiativeDialog();
    return super._onCombatantControl(event, target);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _contextMenu(html) {
    if ( !(html instanceof HTMLElement) ) html = html[0];
    new ContextMenu5e(
      html.querySelector(".directory-list"), ".directory-item:not(.combatant-group)", this._getEntryContextOptions()
    );
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getEntryContextOptions() {
    const options = super._getEntryContextOptions();
    options.forEach(o => {
      const condition = o.condition ?? (function() { return true; });
      o.condition = li => {
        const el = li instanceof HTMLElement ? li : li[0];
        return condition(li) && !el.matches(".combatant-group");
      };
    });
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Adjust initiative tracker to group combatants.
   * @param {HTMLElement} html  The combat tracker being rendered.
   */
  renderGroups(html) {
    if ( !this.viewed ) return;
    const groups = this.viewed.createGroups();
    const V13 = game.release.generation >= 13;
    const list = html.querySelector(".directory-list, .combat-tracker");
    for ( const [key, { combatants, expanded }] of groups.entries() ) {
      const children = list.querySelectorAll(Array.from(combatants).map(c => `[data-combatant-id="${c.id}"]`).join(", "));
      if ( !children.length ) continue;
      const groupContainer = document.createElement("li");
      groupContainer.classList.add("combatant", "combatant-group", "collapsible", "dnd5e2-collapsible");
      if ( !V13 ) groupContainer.classList.add("directory-item");
      if ( !expanded ) groupContainer.classList.add("collapsed");

      // Determine the count
      let activeEntry;
      for ( const [index, element] of children.entries() ) {
        if ( element.classList.contains("active") ) activeEntry = index;
      }
      let count = game.i18n.format(`DND5E.COMBATANT.Counted.${getPluralRules().select(children.length)}`, {
        number: formatNumber(children.length)
      });
      if ( activeEntry !== undefined ) {
        groupContainer.classList.add("active");
        count = game.i18n.format("DND5E.COMBAT.Group.ActiveCount", {
          combatants: count, current: formatNumber(activeEntry + 1)
        });
      }

      const name = combatants[0].token?.baseActor.prototypeToken.name ?? combatants[0].name;
      const img = children[0].querySelector("img");
      groupContainer.innerHTML = `
        <div class="group-header flexrow">
          <img class="token-image" alt="${img.alt}" src="${img.src || img.dataset.src}">
          <div class="token-name flexcol">
            <${V13 ? "strong" : "h4"} class="name"></${V13 ? "strong" : "h4"}>
            <div class="group-numbers">${count}</div>
          </div>
          <div class="token-initiative">
            <i class="fa-solid fa-chevron-down fa-fw" inert></i>
          </div>
        </div>
        <div class="collapsible-content">
          <div class="wrapper">
            <ol class="group-children ${V13 ? "" : "directory-list"}"></ol>
          </div>
        </div>
      `;
      groupContainer.dataset.groupKey = key;
      groupContainer.querySelector(".name").innerText = game.i18n.format("DND5E.COMBAT.Group.Title", { name });
      children[0].before(groupContainer);
      groupContainer.querySelector(".group-children").replaceChildren(...children);
      groupContainer.addEventListener("click", event => {
        if ( event.target.closest(".collapsible-content") ) return;
        if ( groupContainer.classList.contains("collapsed") ) this.viewed.expandedGroups.add(key);
        else this.viewed.expandedGroups.delete(key);
        groupContainer.classList.toggle("collapsed");
      });
    }
  }
}
