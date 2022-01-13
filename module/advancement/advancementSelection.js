/**
 * Presents a list of advancement types to create when clicking the new advancement button.
 * One a type is selected, this hands the process over to the advancement's individual editing interface.
 * @extends {Application}
 */
export class AdvancementSelection extends FormApplication {

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
        disabled: !advancement.availableForItem(this.object)
      };
    }
    // TODO: Sort by label

    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _updateObject(event, formData) {
    const advancement = game.dnd5e.advancement.types[formData.type];
    const config = new advancement.configApp({}, advancement, this.object)
    config.render(true);
    this.close();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onChangeInput(event) {
    super._onChangeInput(event);

    this.form.querySelector("button[type='submit']").disabled = !this.form.querySelector("input[name='type']:checked");
  }

}
