/**
 * A specialized Dialog subclass for ability usage
 * @type {Dialog}
 */
export default class AbilityUseDialog extends Dialog {
  constructor(item, dialogData={}, options={}) {
    super(dialogData, options);
    this.options.classes = ["dnd5e", "dialog"];

    /**
     * Store a reference to the Item entity being used
     * @type {Item5e}
     */
    this.item = item;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * A constructor function which displays the Spell Cast Dialog app for a given Actor and Item.
   * Returns a Promise which resolves to the dialog FormData once the workflow has been completed.
   * @param {Item5e} item
   * @return {Promise}
   */
  static async create(item) {

    const itemData = item.data.data;
    const uses = itemData.uses || {};
    const quantity = itemData.quantity || 0;
    const recharge = itemData.recharge || {};
    const recharges = !!recharge.value;

    // Render the ability usage template
    const html = await renderTemplate("systems/dnd5e/templates/apps/ability-use.html", {
      item: item.data,
      title: game.i18n.format("DND5E.AbilityUseHint", item.data),
      note: this._getAbilityUseNote(item.data, uses, recharge),
      canUse: recharges ? recharge.charged : (quantity > 0 && !uses.value) || uses.value > 0,
      hasPlaceableTemplate: game.user.can("TEMPLATE_CREATE") && item.hasAreaTarget,
    });

    // Create the Dialog and return as a Promise
    return new Promise((resolve) => {
      let formData = null;
      const dlg = new this(item, {
        title: `${item.name}: Usage Configuration`,
        content: html,
        buttons: {
          use: {
            icon: '<i class="fas fa-fist-raised"></i>',
            label: "Use",
            callback: html => formData = new FormData(html[0].querySelector("#ability-use-form"))
          }
        },
        default: "use",
        close: () => resolve(formData)
      });
      dlg.render(true);
    });
  }

  /* -------------------------------------------- */

  static _getAbilityUseNote(item, uses, recharge) {

    // Zero quantity
    const quantity = item.data.quantity;
    if ( quantity <= 0 ) return game.i18n.localize("DND5E.AbilityUseUnavailableHint");

    // Abilities which use Recharge
    if ( !!recharge.value ) {
      return game.i18n.format(recharge.charged ? "DND5E.AbilityUseChargedHint" : "DND5E.AbilityUseRechargeHint", {
        type: item.type,
      })
    }

    // Does not use any resource
    if ( !uses.per || !uses.max ) return "";

    // Consumables
    if ( item.type === "consumable" ) {
      let str = "DND5E.AbilityUseNormalHint";
      if ( uses.value > 1 ) str = "DND5E.AbilityUseConsumableChargeHint";
      else if ( item.data.quantity === 1 && uses.autoDestroy ) str = "DND5E.AbilityUseConsumableDestroyHint";
      else if ( item.data.quantity > 1 ) str = "DND5E.AbilityUseConsumableQuantityHint";
      return game.i18n.format(str, {
        type: item.data.consumableType,
        value: uses.value,
        quantity: item.data.quantity,
      });
    }

    // Other Items
    else {
      return game.i18n.format("DND5E.AbilityUseNormalHint", {
        type: item.type,
        value: uses.value,
        max: uses.max,
        per: CONFIG.DND5E.limitedUsePeriods[uses.per]
      });
    }
  }
}
