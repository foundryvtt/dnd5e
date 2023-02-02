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

  /** @inheritdoc */
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

  /**
   * Get currently selected traits for the actor.
   * @type {Set<string>}
   */
  get selectedTraits() {
    const type = this.advancement.configuration.type;
    return this.constructor.selectedTraits(this.advancement.actor, type);
  }

  /* -------------------------------------------- */

  /**
   * Get selected traits for the provided actor.
   * @param {Actor5e} actor         Actor from which to gather the trait information.
   * @param {string} type           Trait as defined in `CONFIG.DND5E.traits`.
   * @returns {Set<string>}         Set of trait keys.
   */
  static selectedTraits(actor, type) {
    if ( type === "skills" ) return new Set(
      Object.keys(CONFIG.DND5E.skills).filter(key => actor.system.skills[key].value >= 1)
    );

    if ( type === "tool" ) return new Set(
      Object.entries(actor.system.tools).filter(([k, v]) => v.value >= 1).map(([k]) => k)
    );

    if ( type === "saves" ) return new Set(
      Object.keys(CONFIG.DND5E.abilities).filter(key => actor.system.abilities[key].proficient >= 1)
    );

    const keyPath = `${Trait.actorKeyPath(type)}.value`;
    return new Set(foundry.utils.getProperty(actor.system, keyPath));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    this.chosen ??= await this.prepareInitialValue();
    const available = await this.prepareAvailableTraits(this.chosen);
    const type = this.advancement.configuration.type;
    return foundry.utils.mergeObject(super.getData(), {
      hint: (new Intl.ListFormat(game.i18n.lang, { style: "long", type: "conjunction" })).format([
        ...this.advancement.configuration.grants.map(g => Trait.keyLabel(type, g)),
        ...this.advancement.configuration.choices.map(c => Trait.choiceLabel(type, c))
      ]),
      slots: this.prepareTraitSlots(available),
      available
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
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

  /** @inheritdoc */
  async _updateObject(event, formData) {
    if ( !Array.isArray(formData.chosen) ) formData.chosen = [formData.chosen];
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
    if ( existingChosen && existingChosen.size ) return new Set(existingChosen);
    const { available } = await this.constructor.prepareUnfulfilledTraits(
      this.advancement.configuration, {actor: this.selectedTraits}
    );
    const chosen = new Set();
    for ( const { set } of available ) {
      if ( set.size !== 1 ) continue;
      chosen.add(set.values().next().value);
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
    return Array.fromRange(count).map(() => {
      const key = chosen.shift();
      const showSelector = !key && !selectorShown;
      if ( showSelector ) selectorShown = true;
      return {
        key,
        label: key ? Trait.keyLabel(config.type, key) : null,
        showDelete: !this.advancement.configuration.grants.has(key),
        showSelector
      };
    }, []);
  }

  /* -------------------------------------------- */

  /**
   * Prepare the list of available traits that the player can choose.
   * @param {Set<string>} chosen  List of trait keys that have been selected.
   * @returns {{
   *   choices: SelectChoices,
   *   label: string
   * }|null}  Object containing choices to be displayed in form & label for number of choices remaining.
   */
  async prepareAvailableTraits(chosen) {
    const config = this.advancement.configuration;
    let { available, choices } = await this.constructor.prepareUnfulfilledTraits(
      config, {actor: this.selectedTraits, item: chosen}
    );

    // If all traits of this type are already assigned, then nothing new can be selected
    if ( foundry.utils.isEmpty(choices) ) return null;

    // Remove any grants that have no choices remaining
    let unfilteredLength = available.length;
    available = available.filter(a => a.set.size > 0);

    // If replacements are allowed and there are grants with zero choices from their limited set,
    // display all remaining choices as an option
    if ( config.allowReplacements && (unfilteredLength > available.length) ) {
      return {
        choices,
        label: game.i18n.format("DND5E.AdvancementTraitChoicesRemaining", {
          count: unfilteredLength,
          type: Trait.traitLabel(config.type, unfilteredLength)
        })
      };
      // TODO: This works well for types without categories like skills where it is primarily intended,
      // but perhaps there could be some improvements elsewhere. For example, if I have an advancement
      // that grants proficiency in the Bagpipes and allows replacements, but the character already has
      // Bagpipe proficiency. In this example this just lets them choose from any other tool proficiency
      // as their replacement, but it might make sense to only show other musical instruments unless
      // they already have proficiency in all musical instruments. Might not be worth the effort.
    }

    // Create a choices object featuring a union of choices from all remaining grants
    const remainingSet = new Set(available.flatMap(a => Array.from(a.set)));
    choices.filter(remainingSet, { allowCategories: true });

    if ( foundry.utils.isEmpty(choices) ) return null;
    return {
      choices,
      label: game.i18n.format("DND5E.AdvancementTraitChoicesRemaining", {
        count: available.length,
        type: Trait.traitLabel(config.type, available.length)
      })
    };
  }

  /* -------------------------------------------- */

  /**
   * Determine which of the provided grants, if any, still needs to be fulfilled.
   * @param {TraitAdvancementConfig} config  Configuration data for the TraitAdvancement.
   * @param {object} selected
   * @param {Set<string>} [selected.actor]  Values that have already been selected on the actor.
   * @param {Set<string>} [selected.item]   Values that have already been selected on this advancement.
   * @returns {{
   *   available: SelectChoices[],
   *   choices: SelectChoices
   * }}  List of grants to be fulfilled and available choices.
   */
  static async prepareUnfulfilledTraits(config, selected) {
    selected.item ??= new Set();
    const choices = config.choices.reduce((arr, choice) => {
      let count = choice.count;
      while ( count > 0 ) {
        arr.push(new Set(choice.pool ?? []));
        count -= 1;
      }
      return arr;
    }, []);

    // If all of the grants have been selected, no need to go further
    if ( (config.grants.size + choices.length) <= selected.item.size ) return { available: [], choices: {} };

    // Figure out how many choices each grant & choice provides and sort by most restrictive first
    const allChoices = await Trait.choices(config.type);
    let available = [
      ...config.grants.map(g => allChoices.filtered(new Set([g]), { allowCategories: true })),
      ...choices.map(c => c.size ? allChoices.filtered(c) : allChoices)
    ];
    available.sort((lhs, rhs) => lhs.set.size - rhs.set.size);

    // Remove any fulfilled grants
    for ( const key of selected.item ) available.findSplice(grant => grant.set.has(key));

    // Filter out any traits that have already been selected
    allChoices.exclude(new Set([...(selected.actor ?? []), ...selected.item]));
    available = available.map(a => allChoices.filtered(a));

    return { available, choices: allChoices };
  }
}
