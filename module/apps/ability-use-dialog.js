/**
 * A specialized Dialog subclass for ability usage
 * @type {Dialog}
 */
export class AbilityUseDialog extends Dialog {
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

    const uses = item.data.data.uses;
    const recharge = item.data.data.recharge;
    const recharges = !!recharge.value;

    // Render the ability usage template
    const html = await renderTemplate("systems/dnd5e/templates/apps/ability-use.html", {
      item: item.data,
      canUse: recharges ? recharge.charged : uses.value > 0,
      consume: true,
      uses: uses,
      recharges: !!recharge.value,
      isCharged: recharge.charged,
      hasPlaceableTemplate: game.user.can("TEMPLATE_CREATE") && item.hasAreaTarget,
      perLabel: CONFIG.DND5E.limitedUsePeriods[uses.per]
    });

    // Create the Dialog and return as a Promise
    return new Promise((resolve) => {
      let formData = null;
      const dlg = new this(item, {
        title: `${item.name}: Ability Configuration`,
        content: html,
        buttons: {
          use: {
            icon: '<i class="fas fa-fist-raised"></i>',
            label: "Use Ability",
            callback: html => formData = new FormData(html[0].querySelector("#ability-use-form"))
          }
        },
        default: "use",
        close: () => resolve(formData)
      });
      dlg.render(true);
    });
  }
}
