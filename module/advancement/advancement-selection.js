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
  get id() {
    return `item-${this.item.id}-advancement-selection`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    const data = { types: {} };

    for ( const advancement of Object.values(game.dnd5e.advancement.types) ) {
      if ( !advancement.metadata.validItemTypes.has(this.item.type) ) continue;
      data.types[advancement.typeName] = {
        label: advancement.metadata.title,
        icon: advancement.metadata.icon,
        hint: advancement.metadata.hint,
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
   * A helper constructor function which displays the selection dialog and returns a Promise once its workflow has
   * been resolved.
   * @param {Item5e} item                         Item to which the advancement should be added.
   * @param {object} [config={}]
   * @param {boolean} [config.rejectClose=false]  Trigger a rejection if the window was closed without a choice.
   * @param {object} [config.options={}]          Additional rendering options passed to the Dialog.
   * @returns {Promise<AdvancementConfig|null>}   Result of `Item5e#createAdvancement`.
   */
  static async createDialog(item, { rejectClose=false, options={} }={}) {
    return new Promise((resolve, reject) => {
      const dialog = new this(item, {
        title: `${game.i18n.localize("DND5E.AdvancementSelectionTitle")}: ${item.name}`,
        buttons: {
          submit: {
            callback: html => {
              const formData = new FormDataExtended(html.querySelector("form"));
              const type = formData.get("type");
              resolve(item.createAdvancement(type));
            }
          }
        },
        close: () => {
          if ( rejectClose ) reject("No advancement type was selected");
          else resolve(null);
        }
      }, foundry.utils.mergeObject(options, { jQuery: false }));
      dialog.render(true);
    });
  }

}
