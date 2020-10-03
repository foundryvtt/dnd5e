/**
 * A specialized Dialog subclass for ability usage
 * @type {Dialog}
 */
export default class LevelUpDialog extends Dialog {
  constructor(dialogData={}, options={}) {
    super(dialogData, options);
    this.options.classes = ["dnd5e", "dialog"];
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
  static async create() {
		// For now this is just a static template
		// Over time more options will be added
		const data = {};

    // Render the level up template
    const html = await renderTemplate("systems/dnd5e/templates/apps/level-up.html", data);

    // Create the Dialog and return as a Promise
    const label = game.i18n.localize("DND5E.Confirm");
    return new Promise((resolve) => {
      const dlg = new this({
        title: "Choose level up options",
        content: html,
        buttons: {
          confirm: {
            label: label,
            callback: html => resolve(new FormData(html[0].querySelector("form")))
          }
        },
        default: "confirm",
        close: () => resolve(null)
      });
      dlg.render(true);
    });
  }
}
