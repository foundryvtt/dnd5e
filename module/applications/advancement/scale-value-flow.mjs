import AdvancementFlow from "./advancement-flow-v2.mjs";

/**
 * Inline application that displays any changes to a scale value.
 */
export default class ScaleValueFlow extends AdvancementFlow {

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/advancement/scale-value-flow.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContentContext(context, options) {
    context.initial = this.advancement.valueForLevel(this.level - 1)?.display;
    context.final = this.advancement.valueForLevel(this.level).display;
    return context;
  }
}
