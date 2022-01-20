/**
 * Presents a list of advancement types to create when clicking the new advancement button.
 * Once a type is selected, this hands the process over to the advancement's individual editing interface.
 *
 * @extends {Dialog}
 */
export class AdvancementSelection extends Dialog {
  constructor(item, dialogData={}, options={}) {
    super(dialogData, options);

    /**
     * Store a reference to the Item to which this Advancement is being added.
     * @type {Item5e}
     */
    this.item = item;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "advancement"],
      template: "systems/dnd5e/templates/advancement/advancement-selection.html",
      title: "DND5E.AdvancementSelectionTitle",
      width: 500,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    const data = { types: {} };

    for ( const advancement of Object.values(game.dnd5e.advancement.types) ) {
      data.types[advancement.name] = {
        label: game.i18n.localize(advancement.defaultTitle),
        icon: advancement.defaultIcon,
        hint: game.i18n.localize(advancement.hint),
        disabled: !advancement.availableForItem(this.item)
      };
    }
    data.types = game.dnd5e.utils.sortObjectEntries(data.types, "label");

    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.on("change", "input", this._onChangeInput.bind(this));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onChangeInput(event) {
    const submit = this.element[0].querySelector("button[data-button='submit']");
    submit.disabled = !this.element[0].querySelector("input[name='type']:checked");
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the selection dialog and returns a Promise once it's workflow has
   * been resolved.
   * @param {Item5e} item
   * @returns {Promise}
   */
  static async createDialog(item) {
    return new Promise((resolve, reject) => {
      const dlg = new this(item, {
        title: `${game.i18n.localize("DND5E.AdvancementSelectionTitle")}: ${item.name}`,
        buttons: {
          submit: {
            callback: html => {
              const formData = new FormDataExtended(html[0].querySelector("form"));
              const type = formData.get("type");
              resolve(item.createAdvancement(type));
            }
          }
        },
        close: reject
      });
      dlg.render(true);
    });
  }

}
