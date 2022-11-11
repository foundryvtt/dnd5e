/**
 * A specialized Dialog subclass for ability usage.
 *
 * @param {Item5e} item             Item that is being used.
 * @param {object} [dialogData={}]  An object of dialog data which configures how the modal window is rendered.
 * @param {object} [options={}]     Dialog rendering options.
 */
export default class AbilityUseDialog extends Dialog {
  constructor(item, dialogData={}, options={}) {
    super(dialogData, options);
    this.options.classes = ["shaper", "dialog"];

    /**
     * Store a reference to the Item document being used
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
   * @param {Item5e} item  Item being used.
   * @returns {Promise}    Promise that is resolved when the use dialog is acted upon.
   */
  static async create(item) {
    if ( !item.isOwned ) throw new Error("You cannot display an ability usage dialog for an unowned item");

    // Prepare data
    const uses = item.system.uses ?? {};
    const quantity = item.system.quantity ?? 0;
    const recharge = item.system.recharge ?? {};
    const recharges = !!recharge.value;
    const sufficientUses = (quantity > 0 && !uses.value) || uses.value > 0;

    // Prepare dialog form data
    const data = {
      item: item,
      title: game.i18n.format("SHAPER.AbilityUseHint", {type: game.i18n.localize(`SHAPER.ItemType${item.type.capitalize()}`), name: item.name}),
      note: this._getAbilityUseNote(item, uses, recharge),
      consumeRecharge: recharges,
      consumeResource: !!item.system.consume.target,
      consumeUses: uses.per && (uses.max > 0),
      canUse: recharges ? recharge.charged : sufficientUses,
      createTemplate: game.user.can("TEMPLATE_CREATE") && item.hasAreaTarget,
      errors: []
    };

    // Render the ability usage template
    const html = await renderTemplate("systems/shaper/templates/apps/ability-use.hbs", data);

    // Create the Dialog and return data as a Promise
    const icon = "fa-fist-raised";
    const label = game.i18n.localize(`SHAPER.AbilityUse${"Use"}`);
    return new Promise(resolve => {
      const dlg = new this(item, {
        title: `${item.name}: ${game.i18n.localize("SHAPER.AbilityUseConfig")}`,
        content: html,
        buttons: {
          use: {
            icon: `<i class="fas ${icon}"></i>`,
            label: label,
            callback: html => {
              const fd = new FormDataExtended(html[0].querySelector("form"));
              resolve(fd.object);
            }
          }
        },
        default: "use",
        close: () => resolve(null)
      });
      dlg.render(true);
    });
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Get the ability usage note that is displayed.
   * @param {object} item                                     Data for the item being used.
   * @param {{value: number, max: number, per: string}} uses  Object uses and recovery configuration.
   * @param {{charged: boolean, value: string}} recharge      Object recharge configuration.
   * @returns {string}                                        Localized string indicating available uses.
   * @private
   */
  static _getAbilityUseNote(item, uses, recharge) {

    // Zero quantity
    const quantity = item.system.quantity;
    if ( quantity <= 0 ) return game.i18n.localize("SHAPER.AbilityUseUnavailableHint");

    // Abilities which use Recharge
    if ( recharge.value ) {
      return game.i18n.format(recharge.charged ? "SHAPER.AbilityUseChargedHint" : "SHAPER.AbilityUseRechargeHint", {
        type: game.i18n.localize(`SHAPER.ItemType${item.type.capitalize()}`)
      });
    }

    // Does not use any resource
    if ( !uses.per || !uses.max ) return "";

    // Other Items
    else {
      return game.i18n.format("SHAPER.AbilityUseNormalHint", {
        type: game.i18n.localize(`SHAPER.ItemType${item.type.capitalize()}`),
        value: uses.value,
        max: uses.max,
        per: CONFIG.SHAPER.limitedUsePeriods[uses.per]
      });
    }
  }
}
