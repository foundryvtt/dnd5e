/**
 * A Dialog to prompt the user to select from a list of items.
 * @type {Dialog}
 */
export default class SelectItemsPrompt extends Dialog {
  constructor(items, dialogData={}, options={}) {
    super(dialogData, options);
    this.options.classes = ["dnd5e", "dialog", "select-items-prompt", "sheet"];

    /**
     * Store a reference to the Item documents being used
     * @type {Array<Item5e>}
     */
    this.items = items;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Render the item's sheet if its image is clicked
    html.on("click", ".item-image", event => {
      const item = this.items.find(feature => feature.id === event.currentTarget.dataset?.itemId);
      item?.sheet.render(true);
    });
  }

  /**
   * A constructor function which displays the AddItemPrompt app for a given Actor and Item set.
   * Returns a Promise which resolves to the dialog FormData once the workflow has been completed.
   * @param {Array<Item5e>} items  Items that might be added.
   * @param {object} options
   * @param {string} options.hint  Localized hint to display at the top of the prompt
   * @returns {Promise<string[]>}  list of item ids which the user has selected
   */
  static async create(items, {hint}) {
    // Render the ability usage template
    const html = await renderTemplate("systems/dnd5e/templates/apps/select-items-prompt.html", {items, hint});
    return new Promise(resolve => {
      const dlg = new this(items, {
        title: game.i18n.localize("DND5E.SelectItemsPromptTitle"),
        content: html,
        buttons: {
          apply: {
            icon: '<i class="fas fa-user-plus"></i>',
            label: game.i18n.localize("DND5E.Apply"),
            callback: html => {
              const fd = new FormDataExtended(html[0].querySelector("form")).toObject();
              const selectedIds = Object.keys(fd).filter(itemId => fd[itemId]);
              resolve(selectedIds);
            }
          },
          cancel: {
            icon: '<i class="fas fa-forward"></i>',
            label: game.i18n.localize("DND5E.Skip"),
            callback: () => resolve([])
          }
        },
        default: "apply",
        close: () => resolve([])
      });
      dlg.render(true);
    });
  }
}
