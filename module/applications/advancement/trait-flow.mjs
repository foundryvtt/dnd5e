import * as Trait from "../../documents/actor/trait.mjs";
import AdvancementFlow from "./advancement-flow-v2.mjs";

const { StringField } = foundry.data.fields;

/**
 * Inline application that presents the player with a trait choices.
 */
export default class TraitFlow extends AdvancementFlow {

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      removeTrait: TraitFlow.#removeTrait
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/advancement/trait-flow.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Trait configuration from `CONFIG.TRAITS` for this advancement's trait type.
   * @type {TraitConfiguration}
   */
  get traitConfig() {
    return CONFIG.DND5E.traits[this.advancement.configuration.type];
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    const available = await this.advancement.availableChoices();
    if ( available ) context.added = {
      field: new StringField({ required: true, blank: false }),
      options: [
        { value: "", label: available.label },
        ...available.choices.asOptions()
      ]
    };
    context.slots = this.#prepareTraitSlots(available);
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareHeaderContext(context, options) {
    context = await super._prepareHeaderContext(context, options);
    context.hint = this.advancement.hint ? this.advancement.hint : Trait.localizedList({
      grants: this.advancement.configuration.grants, choices: this.advancement.configuration.choices
    });
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the list of slots to be populated by traits.
   * @param {object} available  Trait availability returned by `prepareAvailableTraits`.
   * @returns {object[]}
   */
  #prepareTraitSlots(available) {
    const config = this.advancement.configuration;
    const count = config.choices.reduce((count, c) => count + c.count, config.grants.size);
    const chosen = Array.from(this.advancement.value.chosen ?? []);
    const slots = [];
    for ( let i = 1; i <= count; i++ ) {
      const key = chosen.shift();
      if ( !key ) break;
      slots.push({
        key,
        label: key ? Trait.keyLabel(key, { type: config.type }) : null,
        icon: key ? Trait.keyIcon(key, { type: config.type }) : null,
        showDelete: !this.advancement.configuration.grants.has(key)
      });
    }
    return slots;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle removing a previous trait choice.
   * @this {TraitFlow}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #removeTrait(event, target) {
    const key = target.closest("[data-key]")?.dataset.key;
    if ( key ) await this.advancement.reverse(this.level, { key });
    this.render();
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _handleForm(event, form, formData) {
    if ( formData.object.added ) await this.advancement.apply(this.level, { key: formData.object.added });
  }
}
