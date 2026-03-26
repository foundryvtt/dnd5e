import AdvancementFlow from "./advancement-flow-v2.mjs";

/**
 * Inline application that presents the player with a list of items to be modified.
 */
export default class ModifyItemFlow extends AdvancementFlow {

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/advancement/modify-item-flow.hbs"
    }
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContentContext(context, options) {
    context.changes = this.advancement.configuration.changes.map(change => ({
      enchantment: this.item.effects.get(change._id),
      items: change.identifiers
        .values()
        .flatMap(i => this.advancement.actor.identifiedItems.get(i) ?? new Set())
        .toArray()
    })).filter(c => c.enchantment);
    return context;
  }
}
