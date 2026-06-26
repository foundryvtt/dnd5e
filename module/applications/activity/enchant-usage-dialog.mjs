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
      const existingProfile = this.activity.existingEnchantment?.flags.dnd5e?.enchantmentProfile;
      context.hasCreation = true;
      context.enchantment = {
        field: new StringField({ required: true, blank: false, label: _loc("DND5E.ENCHANTMENT.Label") }),
        name: "enchantmentProfile",
        value: this.config.enchantmentProfile,
        options: (await Promise.all(enchantments.map(async e => {
          const effect = await e.getEffect();
          return effect ? {
            value: e._id,
            label: e._id === existingProfile
              ? _loc("DND5E.ENCHANT.Enchantment.Active", { name: effect.name })
              : effect.name
          } : null;
        }))).filter(_ => _)
      };
    } else if ( enchantments.length ) {
      context.enchantment = enchantments[0]?._id ?? false;
    }

    return context;
  }
}
