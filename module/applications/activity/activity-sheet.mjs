import Application5e from "../api/application.mjs";

/**
 * Default sheet for activities.
 */
export default class ActivitySheet extends Application5e {
  constructor(options={}) {
    super(options);
    this.#activityId = options.document.id;
    this.#item = options.document.item;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["activity", "sheet"],
    tag: "form",
    document: null,
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
    editPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    window: {
      icon: "fa-solid fa-gauge"
    },
    actions: {
      addConsumption: ActivitySheet.#addConsumption,
      addDamagePart: ActivitySheet.#addDamagePart,
      addEffect: ActivitySheet.#addEffect,
      addRecovery: ActivitySheet.#addRecovery,
      deleteConsumption: ActivitySheet.#deleteConsumption,
      deleteDamagePart: ActivitySheet.#deleteDamagePart,
      deleteEffect: ActivitySheet.#deleteEffect,
      deleteRecovery: ActivitySheet.#deleteRecovery,
      dissociateEffect: ActivitySheet.#dissociateEffect,
      toggleCollapsed: ActivitySheet.#toggleCollapsed
    },
    form: {
      handler: ActivitySheet.#onSubmitForm,
      submitOnChange: true
    },
    position: {
      width: 500,
      height: "auto"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    identity: {
      template: "systems/dnd5e/templates/activity/identity.hbs",
      templates: [
        "systems/dnd5e/templates/activity/parts/activity-identity.hbs"
      ]
    },
    activation: {
      template: "systems/dnd5e/templates/activity/activation.hbs",
      templates: [
        "systems/dnd5e/templates/activity/parts/activity-time.hbs",
        "systems/dnd5e/templates/activity/parts/activity-targeting.hbs",
        "systems/dnd5e/templates/activity/parts/activity-consumption.hbs"
      ]
    },
    effect: {
      template: "systems/dnd5e/templates/activity/effect.hbs",
      templates: [
        "systems/dnd5e/templates/activity/parts/activity-effects.hbs"
      ]
    }
  };

  /* -------------------------------------------- */

  /**
   * Key paths to the parts of the submit data stored in arrays that will need special handling on submission.
   * @type {string[]}
   */
  static CLEAN_ARRAYS = ["consumption.targets", "damage.parts", "effects", "uses.recovery"];

  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    sheet: "identity",
    activation: "time"
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The Activity associated with this application.
   * @type {Activity}
   */
  get activity() {
    return this.item.system.activities.get(this.#activityId);
  }

  /**
   * ID of this activity on the parent item.
   * @type {string}
   */
  #activityId;

  /* -------------------------------------------- */

  /**
   * Expanded states for additional settings sections.
   * @type {Map<string, boolean>}
   */
  #expandedSections = new Map();

  get expandedSections() {
    return this.#expandedSections;
  }

  /* -------------------------------------------- */

  /**
   * Is this Activity sheet visible to the current user?
   * @type {boolean}
   */
  get isVisible() {
    return this.item.testUserPermission(game.user, this.options.viewPermission);
  }

  /* -------------------------------------------- */

  /**
   * Is this Document sheet editable by the current User?
   * This is governed by the editPermission threshold configured for the class.
   * @type {boolean}
   */
  get isEditable() {
    if ( game.packs.get(this.item.pack)?.locked ) return false;
    return this.item.testUserPermission(game.user, this.options.editPermission);
  }

  /* -------------------------------------------- */

  /**
   * Parent item to which this activity belongs.
   * @type {Item5e}
   */
  #item;

  get item() {
    return this.#item;
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return this.activity.name;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    return {
      ...await super._prepareContext(options),
      activity: this.activity,
      fields: this.activity.schema.fields,
      inferred: this.activity._inferredSource,
      source: this.activity.toObject(),
      tabs: this._getTabs()
    };
  }

  /* -------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context) {
    switch ( partId ) {
      case "activation": return this._prepareActivationContext(context);
      case "effect": return this._prepareEffectContext(context);
      case "identity": return this._prepareIdentityContext(context);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the activation tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareActivationContext(context) {
    context.tab = context.tabs.activation;

    context.data = {};
    context.disabled = {};
    for ( const field of ["activation", "duration", "range", "target", "uses"] ) {
      context.data[field] = this.activity[field].override ? context.source[field] : context.inferred[field];
      context.disabled[field] = this.activity[field].canOverride && !this.activity[field].override;
    }

    context.activationTypes = [
      ...Object.entries(CONFIG.DND5E.activityActivationTypes).map(([value, config]) => ({
        value,
        label: game.i18n.localize(config.label),
        group: game.i18n.localize(config.group)
      })),
      { value: "", label: game.i18n.localize("DND5E.NoneActionLabel") }
    ];
    context.affectsPlaceholder = game.i18n.localize(
      `DND5E.Target${context.data.target.template.type ? "Every" : "Any"}`
    );
    context.durationUnits = [
      { value: "inst", label: game.i18n.localize("DND5E.TimeInst") },
      ...Object.entries(CONFIG.DND5E.scalarTimePeriods).map(([value, label]) => ({
        value, label, group: game.i18n.localize("DND5E.DurationTime")
      })),
      ...Object.entries(CONFIG.DND5E.permanentTimePeriods).map(([value, label]) => ({
        value, label, group: game.i18n.localize("DND5E.DurationPermanent")
      })),
      { value: "spec", label: game.i18n.localize("DND5E.Special") }
    ];
    context.rangeUnits = [
      ...Object.entries(CONFIG.DND5E.rangeTypes).map(([value, label]) => ({ value, label })),
      ...Object.entries(CONFIG.DND5E.movementUnits).map(([value, label]) => ({
        value, label, group: game.i18n.localize("DND5E.RangeDistance")
      }))
    ];

    // Consumption targets
    const canScale = this.activity.canConfigureScaling;
    const consumptionTypeOptions = Array.from(this.activity.validConsumptionTypes).map(value => ({
      value,
      label: CONFIG.DND5E.activityConsumptionTypes[value].label
    }));
    context.consumptionTargets = context.activity.consumption.targets.map((data, index) => {
      const typeConfig = CONFIG.DND5E.activityConsumptionTypes[data.type] ?? {};
      const showTextTarget = typeConfig.targetRequiresEmbedded && !this.item.isEmbedded;
      return {
        data,
        fields: this.activity.schema.fields.consumption.fields.targets.element.fields,
        prefix: `consumption.targets.${index}.`,
        source: context.source.consumption.targets[index] ?? data,
        typeOptions: consumptionTypeOptions,
        scalingModes: canScale ? [
          { value: "", label: game.i18n.localize("DND5E.CONSUMPTION.Scaling.None") },
          { value: "amount", label: game.i18n.localize("DND5E.CONSUMPTION.Scaling.Amount") },
          ...(typeConfig.scalingModes ?? []).map(({ value, label }) => ({ value, label: game.i18n.localize(label) }))
        ] : null,
        showTargets: "validTargets" in typeConfig,
        targetPlaceholder: data.type === "itemUses" ? game.i18n.localize("DND5E.CONSUMPTION.Target.ThisItem") : null,
        validTargets: showTextTarget ? null : data.validTargets
      };
    });
    context.showConsumeSpellSlot = this.activity.isSpell && (this.item.system.level !== 0);

    // Uses recovery
    context.recoveryPeriods = [
      ...Object.entries(CONFIG.DND5E.limitedUsePeriods)
        .filter(([, config]) => !config.deprecated)
        .map(([value, config]) => ({
          value, label: config.label, group: game.i18n.localize("DND5E.DurationTime")
        })),
      { value: "recharge", label: game.i18n.localize("DND5E.USES.Recovery.Recharge.Label") }
    ];
    context.recoveryTypes = [
      { value: "recoverAll", label: game.i18n.localize("DND5E.USES.Recovery.Type.RecoverAll") },
      { value: "loseAll", label: game.i18n.localize("DND5E.USES.Recovery.Type.LoseAll") },
      { value: "formula", label: game.i18n.localize("DND5E.USES.Recovery.Type.Formula") }
    ];
    context.usesRecovery = context.activity.uses.recovery.map((data, index) => ({
      data,
      fields: this.activity.schema.fields.uses.fields.recovery.element.fields,
      prefix: `uses.recovery.${index}.`,
      source: context.source.uses.recovery[index] ?? data,
      formulaOptions: data.period === "recharge" ? data.recharge?.options : null
    }));

    // Template dimensions
    context.dimensions = context.activity.target.template.dimensions;

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare a specific applied effect if present in the activity data.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {object} effect                     Applied effect context being prepared.
   * @returns {object}
   * @protected
   */
  _prepareAppliedEffectContext(context, effect) {
    return effect;
  }

  /* -------------------------------------------- */

  /**
   * Prepare a specific damage part if present in the activity data.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {object} part                       Damage part context being prepared.
   * @returns {object}
   * @protected
   */
  _prepareDamagePartContext(context, part) {
    return part;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the effect tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareEffectContext(context) {
    context.tab = context.tabs.effect;

    if ( context.activity.effects ) {
      const appliedEffects = new Set(context.activity.effects?.map(e => e._id) ?? []);
      context.allEffects = this.item.effects
        .filter(e => e.type !== "enchantment")
        .map(effect => ({
          value: effect.id, label: effect.name, selected: appliedEffects.has(effect.id)
        }));
      context.appliedEffects = context.activity.effects.reduce((arr, data, index) => {
        if ( !data.effect ) return arr;
        const effect = {
          data,
          collapsed: this.expandedSections.get(`effects.${data._id}`) ? "" : "collapsed",
          effect: data.effect,
          fields: this.activity.schema.fields.effects.element.fields,
          prefix: `effects.${index}.`,
          source: context.source.effects[index] ?? data,
          contentLink: data.effect.toAnchor().outerHTML,
          additionalSettings: null
        };
        arr.push(this._prepareAppliedEffectContext(context, effect));
        return arr;
      }, []);
    }

    context.denominationOptions = [
      { value: "", label: "" },
      ...CONFIG.DND5E.dieSteps.map(value => ({ value, label: `d${value}` }))
    ];
    if ( context.activity.damage?.parts ) {
      const scalingOptions = [
        { value: "", label: game.i18n.localize("DND5E.DAMAGE.Scaling.None") },
        ...Object.entries(CONFIG.DND5E.damageScalingModes).map(([value, config]) => ({ value, label: config.label }))
      ];
      let indexOffset = 0;
      context.damageParts = context.activity.damage.parts.map((data, index) => {
        if ( data.base ) indexOffset--;
        const part = {
          data,
          fields: this.activity.schema.fields.damage.fields.parts.element.fields,
          prefix: `damage.parts.${index + indexOffset}.`,
          source: context.source.damage.parts[index + indexOffset] ?? data,
          canScale: this.activity.canScaleDamage,
          scalingOptions,
          typeOptions: Object.entries(CONFIG.DND5E.damageTypes).map(([value, config]) => ({
            value, label: config.label, selected: data.types.has(value)
          }))
        };
        return this._prepareDamagePartContext(context, part);
      });
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the identity tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareIdentityContext(context) {
    context.tab = context.tabs.identity;
    context.placeholder = {
      name: game.i18n.localize(this.activity.metadata.title),
      img: this.activity.metadata.img
    };
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the tab information for the sheet.
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs() {
    return this._markTabs({
      identity: {
        id: "identity", group: "sheet", icon: "fa-solid fa-tag",
        label: "DND5E.ACTIVITY.SECTIONS.Identity"
      },
      activation: {
        id: "activation", group: "sheet", icon: "fa-solid fa-clapperboard",
        label: "DND5E.ACTIVITY.SECTIONS.Activation",
        tabs: {
          time: {
            id: "time", group: "activation", icon: "fa-solid fa-clock",
            label: "DND5E.ACTIVITY.SECTIONS.Time"
          },
          consumption: {
            id: "consumption", group: "activation", icon: "fa-solid fa-boxes-stacked",
            label: "DND5E.CONSUMPTION.FIELDS.consumption.label"
          },
          targeting: {
            id: "activation-targeting", group: "activation", icon: "fa-solid fa-bullseye",
            label: "DND5E.TARGET.FIELDS.target.label"
          }
        }
      },
      effect: {
        id: "effect", group: "sheet", icon: "fa-solid fa-sun",
        label: "DND5E.ACTIVITY.SECTIONS.Effect"
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Helper to mark the tabs data structure with the appropriate CSS class if it is active.
   * @param {Record<string, Partial<ApplicationTab>>} tabs  Tabs definition to modify.
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @internal
   */
  _markTabs(tabs) {
    for ( const v of Object.values(tabs) ) {
      v.active = this.tabGroups[v.group] === v.id;
      v.cssClass = v.active ? "active" : "";
      if ( "tabs" in v ) this._markTabs(v.tabs);
    }
    return tabs;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @override */
  _canRender(options) {
    if ( !this.isVisible ) throw new Error(game.i18n.format("SHEETS.DocumentSheetPrivate", {
      type: game.i18n.localize("DND5E.ACTIVITY.Title.one")
    }));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.activity.constructor._registerApp(this.activity, this);
    this.item.apps[this.id] = this;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    for ( const element of this.element.querySelectorAll("[data-expand-id]") ) {
      element.querySelector(".collapsible")?.classList
        .toggle("collapsed", !this.#expandedSections.get(element.dataset.expandId));
    }
    this.#toggleNestedTabs();
  }

  /* -------------------------------------------- */

  /** @override */
  _onClose(_options) {
    this.activity?.constructor._unregisterApp(this.activity, this);
    delete this.item.apps[this.id];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  changeTab(tab, group, options={}) {
    super.changeTab(tab, group, options);
    if ( group !== "sheet" ) return;
    this.#toggleNestedTabs();
  }

  /* -------------------------------------------- */

  /**
   * Apply nested tab classes.
   */
  #toggleNestedTabs() {
    const primary = this.element.querySelector('.window-content > [data-application-part="tabs"]');
    const active = this.element.querySelector('.tab.active[data-group="sheet"]');
    if ( !primary || !active ) return;
    primary.classList.toggle("nested-tabs", active.querySelector(":scope > .sheet-tabs"));
  }

  /* -------------------------------------------- */

  /**
   * Handle adding a new entry to the consumption list.
   * @this {ActivitySheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #addConsumption(event, target) {
    const types = this.activity.validConsumptionTypes;
    const existingTypes = new Set(this.activity.consumption.targets.map(t => t.type));
    const filteredTypes = types.difference(existingTypes);
    this.activity.update({
      "consumption.targets": [
        ...this.activity.toObject().consumption.targets,
        { type: filteredTypes.first() ?? types.first() }
      ]
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle adding a new entry to the damage parts list.
   * @this {ActivitySheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #addDamagePart(event, target) {
    if ( !this.activity.damage?.parts ) return;
    this.activity.update({ "damage.parts": [...this.activity.toObject().damage.parts, {}] });
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new active effect and adding it to the applied effects list.
   * @this {ActivitySheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #addEffect(event, target) {
    if ( !this.activity.effects ) return;
    const effectData = this._addEffectData();
    const [created] = await this.item.createEmbeddedDocuments("ActiveEffect", [effectData], { render: false });
    this.activity.update({ effects: [...this.activity.toObject().effects, { _id: created.id }] });
  }

  /* -------------------------------------------- */

  /**
   * The data for a newly created applied effect.
   * @returns {object}
   * @protected
   */
  _addEffectData() {
    return {
      name: this.item.name,
      img: this.item.img,
      origin: this.item.uuid,
      transfer: false
    };
  }

  /* -------------------------------------------- */

  /**
   * Handle adding a new entry to the uses recovery list.
   * @this {ActivitySheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #addRecovery(event, target) {
    const periods = new Set(
      Object.entries(CONFIG.DND5E.limitedUsePeriods).filter(([, config]) => !config.deprecated).map(([k]) => k)
    );
    const existingPeriods = new Set(this.activity.uses.recovery.map(t => t.period));
    const filteredPeriods = periods.difference(existingPeriods);
    this.activity.update({
      "uses.recovery": [
        ...this.activity.toObject().uses.recovery,
        { period: filteredPeriods.first() ?? periods.first() }
      ]
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing an entry from the consumption targets list.
   * @this {ActivitySheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #deleteConsumption(event, target) {
    const consumption = this.activity.toObject().consumption.targets;
    consumption.splice(target.closest("[data-index]").dataset.index, 1);
    this.activity.update({ "consumption.targets": consumption });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing an entry from the damage parts list.
   * @this {ActivitySheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #deleteDamagePart(event, target) {
    if ( !this.activity.damage?.parts ) return;
    const parts = this.activity.toObject().damage.parts;
    parts.splice(target.closest("[data-index]").dataset.index, 1);
    this.activity.update({ "damage.parts": parts });
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting an active effect and removing it from the applied effects list.
   * @this {ActivitySheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #deleteEffect(event, target) {
    if ( !this.activity.effects ) return;
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    const result = await this.item.effects.get(effectId)?.deleteDialog({}, { render: false });
    if ( result instanceof ActiveEffect ) {
      const effects = this.activity.toObject().effects.filter(e => e._id !== effectId);
      this.activity.update({ effects });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle removing an entry from the uses recovery list.
   * @this {ActivitySheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #deleteRecovery(event, target) {
    const recovery = this.activity.toObject().uses.recovery;
    recovery.splice(target.closest("[data-index]").dataset.index, 1);
    this.activity.update({ "uses.recovery": recovery });
  }

  /* -------------------------------------------- */

  /**
   * Handle dissociating an Active Effect from this Activity.
   * @this {ActivitySheet}
   * @param {PointerEvent} event  The triggering click event.
   * @param {HTMLElement} target  The button that was clicked.
   */
  static #dissociateEffect(event, target) {
    const { effectId } = target.closest("[data-effect-id]")?.dataset ?? {};
    if ( !this.activity.effects || !effectId ) return;
    const effects = this.activity.toObject().effects.filter(e => e._id !== effectId);
    this.activity.update({ effects });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the collapsed state of an additional settings section.
   * @this {ActivitySheet}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #toggleCollapsed(event, target) {
    if ( event.target.closest(".collapsible-content") ) return;
    target.classList.toggle("collapsed");
    this.#expandedSections.set(
      target.closest("[data-expand-id]")?.dataset.expandId,
      !target.classList.contains("collapsed")
    );
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Handle form submission.
   * @param {SubmitEvent} event          Triggering submit event.
   * @param {HTMLFormElement} form       The form that was submitted.
   * @param {FormDataExtended} formData  Data from the submitted form.
   */
  static async #onSubmitForm(event, form, formData) {
    const submitData = this._prepareSubmitData(event, formData);
    await this._processSubmitData(event, submitData);
  }

  /* -------------------------------------------- */

  /**
   * Perform any pre-processing of the form data to prepare it for updating.
   * @param {SubmitEvent} event          Triggering submit event.
   * @param {FormDataExtended} formData  Data from the submitted form.
   * @returns {object}
   */
  _prepareSubmitData(event, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    for ( const keyPath of this.constructor.CLEAN_ARRAYS ) {
      const data = foundry.utils.getProperty(submitData, keyPath);
      if ( data ) foundry.utils.setProperty(submitData, keyPath, Object.values(data));
    }
    if ( foundry.utils.hasProperty(submitData, "appliedEffects") ) {
      const effects = submitData.effects ?? this.activity.toObject().effects;
      submitData.effects = effects.filter(e => submitData.appliedEffects.includes(e._id));
      for ( const _id of submitData.appliedEffects ) {
        if ( submitData.effects.find(e => e._id === _id) ) continue;
        submitData.effects.push({ _id });
      }
    }
    // Workaround for https://github.com/foundryvtt/foundryvtt/issues/11610
    this.element.querySelectorAll("fieldset legend :is(input, select, dnd5e-checkbox)").forEach(input => {
      foundry.utils.setProperty(submitData, input.name, input.value);
    });
    return submitData;
  }

  /* -------------------------------------------- */

  /**
   * Handle updating the activity based on processed submit data.
   * @param {SubmitEvent} event  Triggering submit event.
   * @param {object} submitData  Prepared object for updating.
   */
  async _processSubmitData(event, submitData) {
    await this.activity.update(submitData);
  }
}
