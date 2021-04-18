/**
 * A Dialog to prompt the user to select from a list of features.
 * @type {Dialog}
 */
export default class AddFeaturePrompt extends Dialog {
  constructor(features, dialogData={}, options={}) {
    super(dialogData, options);
    this.options.classes = ["dnd5e", "dialog", "add-feature-prompt", "sheet"];

    /**
     * Store a reference to the Item entities being used
     * @type {Array<Item5e>}
     */
    this.features = features;
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // render the item's sheet if its image is clicked
    html.on('click', '.item-image', (event) => {
      const item = this.features.find((feature) => feature.id === event.currentTarget.dataset?.itemId);

      item?.sheet.render(true);
    })
  }

  /**
   * A constructor function which displays the Add Features Prompt app for a given Actor and Item set.
   * Returns a Promise which resolves to the dialog FormData once the workflow has been completed.
   * @param {Array<Item5e>} features
   * @return {Promise}
   */
  static async create(features) {
    // Prepare dialog form data
    const data = {
      features
    };

    // Render the ability usage template
    const html = await renderTemplate("systems/dnd5e/templates/apps/add-feature-prompt.html", data);

    return new Promise((resolve) => {
      const dlg = new this(features, {
        title: game.i18n.localize('DND5E.AddFeaturePromptTitle'),
        content: html,
        buttons: {
          apply: {
            icon: `<i class="fas fa-user-plus"></i>`,
            label: game.i18n.localize('DND5E.Apply'),
            callback: html => {
              const fd = new FormDataExtended(html[0].querySelector("form")).toObject();

              const selectedIds = Object.keys(fd).filter(itemId => fd[itemId]);

              resolve(selectedIds);
            }
          },
          cancel: {
            icon: '<i class="fas fa-forward"></i>',
            label: game.i18n.localize('DND5E.Skip'),
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
