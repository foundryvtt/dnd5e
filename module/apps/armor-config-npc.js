/**
 * Interface for managing and NPC's armor calculation.
 *
 * @extends {DocumentSheet}
 */
export default class ArmorConfigNPC extends DocumentSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "armor-config-npc",
      classes: ["dnd5e"],
      template: "systems/dnd5e/templates/apps/armor-config-npc.html",
      width: 320,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return `${game.i18n.localize("DND5E.ArmorConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    
  }
}
