import ActivityUsageDialog from "./activity-usage-dialog.mjs";

const { StringField } = foundry.data.fields;

/**
 * Dialog for configuring the usage of an activity.
 */
export default class EnchantUsageDialog extends ActivityUsageDialog {

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    creation: {
      template: "systems/dnd5e/templates/activity/enchant-usage-creation.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareCreationContext(context, options) {
    context = await super._prepareCreationContext(context, options);

    const enchantments = this.activity.availableEnchantments;
    if ( (enchantments.length > 1) && this._shouldDisplay("create.enchantment") ) {
      context.hasCreation = true;
      context.enchantment = {
        field: new StringField({ label: game.i18n.localize("DND5E.ENCHANTMENT.Label") }),
        name: "enchantmentProfile",
        value: this.config.enchantmentProfile,
        options: enchantments.map(e => ({ value: e._id, label: e.effect.name }))
      };
    } else if ( enchantments.length ) {
      context.enchantment = enchantments[0]?._id ?? false;
    }

    return context;
  }
}
