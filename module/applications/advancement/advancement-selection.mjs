/**
 * Presents a list of advancement types to create when clicking the new advancement button.
 * Once a type is selected, this hands the process over to the advancement's individual editing interface.
 *
 * @param {Item5e} item             Item to which this advancement will be added.
 * @param {object} [dialogData={}]  An object of dialog data which configures how the modal window is rendered.
 * @param {object} [options={}]     Dialog rendering options.
 */
export default class AdvancementSelection extends Dialog {
  constructor(item, dialogData={}, options={}) {
    foundry.utils.logCompatibilityWarning(
      "The `AdvancementSelection` dialog has been deprecated and replaced with `Advancement#createDialog`.",
      { since: "DnD5e 4.4", until: "DnD5e 5.2" }
    );
    super(dialogData, options);

    /**
     * Store a reference to the Item to which this Advancement is being added.
     * @type {Item5e}
     */
    this.item = item;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "sheet", "advancement"],
      template: "systems/dnd5e/templates/advancement/advancement-selection.hbs",
      title: "DND5E.AdvancementSelectionTitle",
      width: 500,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get id() {
    return `item-${this.item.id}-advancement-selection`;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData() {
    const context = { types: {} };
    for ( let [name, config] of Object.entries(CONFIG.DND5E.advancementTypes) ) {
      const advancement = config.documentClass;
      if ( config.hidden || !config.validItemTypes?.has(this.item.type) ) continue;
      context.types[name] = {
        label: advancement.metadata.title,
        icon: advancement.metadata.typeIcon,
        hint: advancement.metadata.hint,
        disabled: !advancement.availableForItem(this.item)
      };
    }
    context.types = dnd5e.utils.sortObjectEntries(context.types, "label");
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.on("change", "input", this._onChangeInput.bind(this));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
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
    foundry.utils.logCompatibilityWarning(
      "The `AdvancementSelection#createDialog` dialog has been deprecated and replaced with `Advancement#createDialog`.",
      { since: "DnD5e 4.4", until: "DnD5e 5.2" }
    );
    const advancement = await dnd5e.documents.advancement.Advancement.createDialog({}, { parent: item });
    return advancement?.sheet.render(true) ?? null;
  }

}
