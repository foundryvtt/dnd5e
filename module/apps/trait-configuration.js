/**
 * A form used to configure player choices for skill, tool, language, and other proficiencies
 * on Background and Class items.
 * @extends {DocumentSheet}
 */
export default class TraitConfiguration extends DocumentSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "trait-configuration",
      classes: ["dnd5e", "trait-configuration", "subconfig"],
      title: "Trait Configuration",
      template: "systems/dnd5e/templates/apps/trait-configuration.html",
      width: 480,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {

    return { }
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {

  }
}
