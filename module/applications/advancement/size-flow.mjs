import AdvancementFlow from "./advancement-flow-v2.mjs";

const { StringField } = foundry.data.fields;

/**
 * Inline application that displays size advancement.
 */
export default class SizeFlow extends AdvancementFlow {

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/advancement/size-flow.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    const sizes = this.advancement.configuration.sizes;
    context.size = sizes.size > 1 ? {
      field: new StringField({ required: true, blank: false }),
      options: Array.from(sizes).map(value => ({
        value, label: CONFIG.DND5E.actorSizes[value].label
      })),
      value: this.advancement.value.size
    } : null;
    return context;
  }
}
