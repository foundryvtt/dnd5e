import AdvancementFlow from "./advancement-flow.mjs";

/**
 * Inline application that presents the player with the subclass hint.
 */
export default class SubclassFlow extends AdvancementFlow {
  /** @inheritDoc */
  async getData() {
    return foundry.utils.mergeObject(super.getData(), {
      hint: `${this.advancement.hint ?? ""} ${game.i18n.localize("DND5E.ADVANCEMENT.Subclass.FlowHint")}`
    });
  }
}
