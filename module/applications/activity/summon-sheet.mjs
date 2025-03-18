import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the summon activity.
 */
export default class SummonSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["summon-activity"],
    actions: {
      addProfile: SummonSheet.#addProfile,
      deleteProfile: SummonSheet.#deleteProfile
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: "systems/dnd5e/templates/activity/summon-effect.hbs",
      templates: [
        "systems/dnd5e/templates/activity/parts/activity-effects.hbs",
        "systems/dnd5e/templates/activity/parts/summon-changes.hbs",
        "systems/dnd5e/templates/activity/parts/summon-profiles.hbs"
      ]
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static CLEAN_ARRAYS = [...super.CLEAN_ARRAYS, "profiles"];

  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    sheet: "identity",
    activation: "time",
    effect: "profiles"
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context) {
    context = await super._prepareEffectContext(context);

    context.abilityOptions = [
      { value: "", label: this.activity.isSpell ? game.i18n.localize("DND5E.Spellcasting") : "" },
      { rule: true },
      ...Object.entries(CONFIG.DND5E.abilities).map(([value, { label }]) => ({ value, label }))
    ];
    context.creatureSizeOptions = Object.entries(CONFIG.DND5E.actorSizes).map(([value, config]) => ({
      value, label: config.label, selected: this.activity.creatureSizes.has(value)
    }));
    context.creatureTypeOptions = Object.entries(CONFIG.DND5E.creatureTypes).map(([value, config]) => ({
      value, label: config.label, selected: this.activity.creatureTypes.has(value)
    }));

    context.profileModes = [
      { value: "", label: game.i18n.localize("DND5E.SUMMON.FIELDS.summon.mode.Direct") },
      { value: "cr", label: game.i18n.localize("DND5E.SUMMON.FIELDS.summon.mode.CR") }
    ];
    context.profiles = this.activity.profiles.map((data, index) => ({
      data, index,
      collapsed: this.expandedSections.get(`profiles.${data._id}`) ? "" : "collapsed",
      fields: this.activity.schema.fields.profiles.element.fields,
      prefix: `profiles.${index}.`,
      source: context.source.profiles[index] ?? data,
      document: data.uuid ? fromUuidSync(data.uuid) : null,
      mode: this.activity.summon.mode,
      typeOptions: this.activity.summon.mode === "cr" ? context.creatureTypeOptions.map(t => ({
        ...t, selected: data.types.has(t.value)
      })) : null
    })).sort((lhs, rhs) =>
      (lhs.name || lhs.document?.name || "").localeCompare(rhs.name || rhs.document?.name || "", game.i18n.lang)
    );

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareIdentityContext(context) {
    context = await super._prepareIdentityContext(context);
    context.behaviorFields.push({
      field: context.fields.summon.fields.prompt,
      value: context.source.summon.prompt,
      input: context.inputs.createCheckboxInput
    });
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getTabs() {
    const tabs = super._getTabs();
    tabs.effect.label = "DND5E.SUMMON.SECTIONS.Summoning";
    tabs.effect.icon = "fa-solid fa-spaghetti-monster-flying";
    tabs.effect.tabs = this._markTabs({
      profiles: {
        id: "profiles", group: "effect", icon: "fa-solid fa-address-card",
        label: "DND5E.SUMMON.SECTIONS.Profiles"
      },
      changes: {
        id: "changes", group: "effect", icon: "fa-solid fa-sliders",
        label: "DND5E.SUMMON.SECTIONS.Changes"
      }
    });
    return tabs;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender() {
    super._onRender();
    this.element.querySelector(".activity-profiles").addEventListener("drop", this.#onDrop.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle adding a new entry to the summoning profiles list.
   * @this {ActivityConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #addProfile(event, target) {
    this.activity.update({ profiles: [...this.activity.toObject().profiles, {}] });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing an entry from the summoning profiles list.
   * @this {ActivityConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #deleteProfile(event, target) {
    const profiles = this.activity.toObject().profiles;
    profiles.splice(target.closest("[data-index]").dataset.index, 1);
    this.activity.update({ profiles });
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /**
   * Handle dropping actors onto the sheet.
   * @param {Event} event  Triggering drop event.
   */
  async #onDrop(event) {
    // Try to extract the data
    const data = TextEditor.getDragEventData(event);

    // Handle dropping linked items
    if ( data?.type !== "Actor" ) return;
    const actor = await Actor.implementation.fromDropData(data);

    // If dropped onto existing profile, add or replace link
    const profileId = event.target.closest("[data-profile-id]")?.dataset.profileId;
    if ( profileId ) {
      const profiles = this.activity.toObject().profiles;
      const profile = profiles.find(p => p._id === profileId);
      profile.uuid = actor.uuid;
      this.activity.update({ profiles });
    }

    // Otherwise create a new profile
    else this.activity.update({ profiles: [...this.activity.toObject().profiles, { uuid: actor.uuid }] });
  }
}
