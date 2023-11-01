import AdvancementFlow from "./advancement-flow.mjs";

/**
 * Inline application that displays size advancement.
 */
export default class SizeFlow extends AdvancementFlow {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/size-flow.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      selectedSize: this.retainedData?.size ?? this.advancement.value.size,
      sizes: Array.from(this.advancement.configuration.sizes).reduce((obj, key) => {
        obj[key] = CONFIG.DND5E.actorSizes[key];
        return obj;
      }, {})
    });
  }
}
