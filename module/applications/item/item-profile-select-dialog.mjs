/**
 * A specialized Dialog subclass for ability usage.
 *
 * @param {Item5e} item             Item that is being used.
 * @param {object} [dialogData={}]  An object of dialog data which configures how the modal window is rendered.
 * @param {object} [options={}]     Dialog rendering options.
 */
export default class ItemProfileSelectDialog extends Dialog {
  constructor(item, dialogData={}, options={}) {
    super(dialogData, options);
    this.options.classes = ["dnd5e", "dialog", "item-use-dialog"];

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

    // Create the Dialog and return data as a Promise
    return new Promise(resolve => {
      const dialog = new this(item, {
        title: `${item.name} - ${game.i18n.localize(`DND5E.ItemUsageProfileType${item.type.titleCase()}Select`)}`,
        buttons: item.system.usageProfiles.reduce(
          (result, usageProfile, index) => {
            result[`item-use-dialog-button-${index}`] = {
              label: usageProfile.profileName || game.i18n.localize("DND5E.Untitled"),
              callback: () => resolve(index)
            };
            return result;
          },
          {}
        ),
        close: () => resolve(null)
      });
      dialog.render(true);
    });
  }
}
