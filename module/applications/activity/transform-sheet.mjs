import TransformationSetting from "../../data/settings/transformation-setting.mjs";
import { filteredKeys } from "../../utils.mjs";
import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the summon activity.
 */
export default class TransformSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["transform-activity"],
    actions: {
      addProfile: TransformSheet.#addProfile,
      deleteProfile: TransformSheet.#deleteProfile
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: "systems/dnd5e/templates/activity/transform-effect.hbs",
      templates: [
        "systems/dnd5e/templates/activity/parts/activity-effects.hbs",
        "systems/dnd5e/templates/activity/parts/transform-profiles.hbs",
        "systems/dnd5e/templates/activity/parts/transform-settings.hbs"
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

    const settings = new TransformationSetting({
      ...(context.source.transform.customize ? context.source.settings
        : CONFIG.DND5E.transformation.presets[context.source.transform.preset]?.settings ?? {}),
      preset: context.source.transform.preset
    });
    context.categories = settings.createFormCategories({ prefix: "settings." });
    context.presetOptions = [
      { value: "", label: game.i18n.localize("DND5E.TRANSFORM.Preset.Default") },
      { rule: true },
      ...Object.entries(CONFIG.DND5E.transformation.presets)
        .map(([value, { label }]) => ({ value, label }))
    ];

    context.creatureSizeOptions = Object.entries(CONFIG.DND5E.actorSizes)
      .map(([value, { label }]) => ({ value, label }));
    context.creatureTypeOptions = Object.entries(CONFIG.DND5E.creatureTypes)
      .map(([value, { label }]) => ({ value, label }));
    context.movementTypeOptions = Object.entries(CONFIG.DND5E.movementTypes)
      .map(([value, { label }]) => ({ value, label }));

    context.profileModes = [
      { value: "", label: game.i18n.localize("DND5E.TRANSFORM.FIELDS.transform.mode.Direct") },
      { value: "cr", label: game.i18n.localize("DND5E.TRANSFORM.FIELDS.transform.mode.CR") }
    ];
    context.profiles = context.source.profiles.map((data, index) => ({
      data, index,
      collapsed: this.expandedSections.get(`profiles.${data._id}`) ? "" : "collapsed",
      document: data.uuid ? fromUuidSync(data.uuid) : null,
      fields: this.activity.schema.fields.profiles.element.fields,
      prefix: `profiles.${index}.`,
      source: context.source.profiles[index] ?? data
    })).sort((lhs, rhs) => (lhs.name || "").localeCompare(rhs.name || "", game.i18n.lang));

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getTabs() {
    const tabs = super._getTabs();
    tabs.effect.label = "DND5E.TRANSFORM.SECTIONS.Transformation";
    tabs.effect.icon = "fa-solid fa-frog";
    tabs.effect.tabs = this._markTabs({
      profiles: {
        id: "profiles", group: "effect", icon: "fa-solid fa-address-card",
        label: "DND5E.TRANSFORM.SECTIONS.Profiles"
      },
      settings: {
        id: "settings", group: "effect", icon: "fa-solid fa-sliders",
        label: "DND5E.TRANSFORM.SECTIONS.Settings"
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
   * Handle adding a new entry to the transform profiles list.
   * @this {TransformSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #addProfile(event, target) {
    this.activity.update({ profiles: [...this.activity.toObject().profiles, {}] });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing an entry from the transform profiles list.
   * @this {TransformSheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #deleteProfile(event, target) {
    const profiles = this.activity.toObject().profiles;
    profiles.splice(target.closest("[data-index]").dataset.index, 1);
    this.activity.update({ profiles });
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareSubmitData(event, formData) {
    const submitData = super._prepareSubmitData(event, formData);
    if ( submitData.settings ) {
      for ( const category of ["keep", "merge", "effects", "other"] ) {
        submitData.settings[category] = filteredKeys(submitData.settings[category] ?? {});
      }
    }
    return submitData;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _processSubmitData(event, submitData) {
    // If customize is set but no settings set, save defaults
    if ( submitData.transform?.customize && !this.activity._source.settings ) {
      const preset = submitData.transform.preset ?? this.activity.transform.preset;
      submitData.settings = new TransformationSetting(foundry.utils.mergeObject({
        ...(CONFIG.DND5E.transformation.presets[preset]?.settings ?? {}),
        preset: this.activity.transform.preset
      }, submitData.settings ?? {}, { inplace: false })).toObject();
    }

    // If customize is unchecked and settings set, remove settings
    else if ( (submitData.transform?.customize === false) && this.activity.settings ) submitData.settings = null;

    await super._processSubmitData(event, submitData);
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
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

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
