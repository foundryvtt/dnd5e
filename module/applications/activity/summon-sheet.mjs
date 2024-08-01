import ActivitySheet from "./activity-sheet.mjs";

/**
 * Default sheet for activities.
 */
export default class SummonSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["summon-activity"],
    actions: {
      addProfile: SummonSheet.#addProfile,
      deleteProfile: SummonSheet.#deleteProfile,
      toggleCollapsed: SummonSheet.#toggleCollapsed
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    identity: {
      template: "systems/dnd5e/templates/activity/summon-identity.hbs",
      templates: super.PARTS.identity.templates
    },
    effect: {
      template: "systems/dnd5e/templates/activity/summon-effect.hbs",
      templates: [
        "systems/dnd5e/templates/activity/parts/summon-changes.hbs",
        "systems/dnd5e/templates/activity/parts/summon-profiles.hbs"
      ]
    }
  };

  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    sheet: "identity",
    activation: "time",
    effect: "profiles"
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Expanded states for each profile.
   * @type {Map<string, boolean>}
   */
  #expandedProfiles = new Map();

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context) {
    context = await super._prepareEffectContext(context);

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
      collapsed: this.#expandedProfiles.get(data._id) ? "" : "collapsed",
      fields: this.activity.schema.fields.profiles.element.fields,
      prefix: `profiles.${index}.`,
      source: this.activity.toObject().profiles[index] ?? data,
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
    this.addProfile();
  }

  /* -------------------------------------------- */

  /**
   * Add a new summoning profile.
   * @param {object} [data={}]  Initial creation data for the new profile.
   */
  addProfile(data={}) {
    this.activity.update({
      profiles: [...this.activity.toObject().profiles, { _id: foundry.utils.randomID(), ...data }]
    });
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

  /**
   * Handle toggling the collapsed state of an additional settings section.
   * @this {ActivityConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #toggleCollapsed(event, target) {
    if ( event.target.closest(".collapsible-content") ) return;
    target.classList.toggle("collapsed");
    this.#expandedProfiles.set(
      target.closest("[data-profile-id]").dataset.profileId,
      !event.currentTarget.classList.contains("collapsed")
    );
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
    else this.addProfile({ uuid: actor.uuid });
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Perform any pre-processing of the form data to prepare it for updating.
   * @param {SubmitEvent} event          Triggering submit event.
   * @param {FormDataExtended} formData  Data from the submitted form.
   * @returns {object}
   */
  _prepareSubmitData(event, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    if ( foundry.utils.hasProperty(submitData, "profiles") ) {
      submitData.profiles = Object.values(submitData.profiles);
    }
    return submitData;
  }
}
