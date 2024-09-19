import AdvancementFlow from "./advancement-flow.mjs";
import * as Trait from "../../documents/actor/trait.mjs";

/**
 * Inline application that presents the player with a trait choices.
 */
export default class TraitFlow extends AdvancementFlow {

  /**
   * Array of trait keys currently chosen.
   * @type {Set<string>}
   */
  chosen;

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/trait-flow.hbs"
    });
  }

  /* -------------------------------------------- */

  /**
   * Trait configuration from `CONFIG.TRAITS` for this advancement's trait type.
   * @type {TraitConfiguration}
   */
  get traitConfig() {
    return CONFIG.DND5E.traits[this.advancement.configuration.type];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData() {
    this.chosen ??= await this.prepareInitialValue();
    const available = await this.advancement.availableChoices(this.chosen);
    return foundry.utils.mergeObject(super.getData(), {
      hint: this.advancement.hint ? this.advancement.hint : Trait.localizedList({
        grants: this.advancement.configuration.grants, choices: this.advancement.configuration.choices
      }),
      slots: this.prepareTraitSlots(available),
      available
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    this.form.querySelectorAll("select").forEach(s => s.addEventListener("change", this._onSelectTrait.bind(this)));
    this.form.querySelectorAll(".remove").forEach(s => s.addEventListener("click", this._onRemoveTrait.bind(this)));
  }

  /* -------------------------------------------- */

  /**
   * Add a trait to the value when one is selected.
   * @param {Event} event  Triggering change to a select input.
   */
  _onSelectTrait(event) {
    const addedTrait = event.target.value;
    if ( addedTrait === "" ) return;
    this.chosen.add(addedTrait);
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Remove a trait for the value when the remove button is clicked.
   * @param {Event} event  Triggering click.
   */
  _onRemoveTrait(event) {
    const tag = event.target.closest(".trait-slot");
    this.chosen.delete(tag.dataset.key);
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    if ( formData.chosen && !Array.isArray(formData.chosen) ) formData.chosen = [formData.chosen];
    super._updateObject(event, formData);
  }

  /* -------------------------------------------- */
  /*  Data Preparation Methods                    */
  /* -------------------------------------------- */

  /**
   * When only a single choice is available, automatically select that choice provided value is empty.
   * @returns {Set<string>}
   */
  async prepareInitialValue() {
    const existingChosen = this.retainedData?.chosen ?? this.advancement.value.chosen;
    if ( existingChosen?.size ) return new Set(existingChosen);
    const { available } = await this.advancement.unfulfilledChoices();
    const chosen = new Set();
    for ( const { choices } of available ) {
      const set = choices.asSet();
      if ( set.size === 1 ) chosen.add(set.first());
    }
    return chosen;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the list of slots to be populated by traits.
   * @param {object} available  Trait availability returned by `prepareAvailableTraits`.
   * @returns {object[]}
   */
  prepareTraitSlots(available) {
    const config = this.advancement.configuration;
    const count = config.choices.reduce((count, c) => count + c.count, config.grants.size);
    const chosen = Array.from(this.chosen);
    let selectorShown = false;
    const slots = [];
    for ( let i = 1; i <= count; i++ ) {
      const key = chosen.shift();
      if ( selectorShown || (!key && !available) ) continue;
      selectorShown = !key;
      slots.push({
        key,
        label: key ? Trait.keyLabel(key, { type: config.type }) : null,
        showDelete: !this.advancement.configuration.grants.has(key),
        showSelector: !key
      });
    }
    return slots;
  }
}
