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
      addEffect: ActivitySheet.#addEffect,
      addRecovery: ActivitySheet.#addRecovery,
      deleteConsumption: ActivitySheet.#deleteConsumption,
      deleteEffect: ActivitySheet.#deleteEffect,
      deleteRecovery: ActivitySheet.#deleteRecovery
    },
    form: {
      handler: ActivitySheet.#onSubmitForm,
      submitOnChange: true
    },
    position: {
      width: 540,
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
      template: "systems/dnd5e/templates/activity/identity.hbs"
    },
    activation: {
      template: "systems/dnd5e/templates/activity/activation.hbs",
      templates: [
        "systems/dnd5e/templates/activity/parts/activity-time.hbs",
        "systems/dnd5e/templates/activity/parts/activity-targeting.hbs",
        "systems/dnd5e/templates/activity/parts/activity-consumption.hbs",
        "systems/dnd5e/templates/shared/uses-recovery.hbs",
        "systems/dnd5e/templates/shared/uses-values.hbs"
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
   * @param {object} context  Context being prepared.
   * @returns {object}
   */
  async _prepareActivationContext(context) {
    context.tab = context.tabs.activation;

    context.activationTypes = Object.entries(CONFIG.DND5E.activityActivationTypes).map(([value, config]) => ({
      value,
      label: game.i18n.localize(config.label),
      group: game.i18n.localize(config.group)
    }));
    context.affectsPlaceholder = game.i18n.localize(
      `DND5E.Target${context.activity.target.template.type ? "Every" : "Any"}`
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
    context.scalar = {
      activation: CONFIG.DND5E.activityActivationTypes[context.activity.activation.type]?.scalar,
      duration: context.activity.duration.units in CONFIG.DND5E.scalarTimePeriods,
      range: context.activity.range.units in CONFIG.DND5E.movementUnits,
      target: !["", "self", "any"].includes(context.activity.target.affects.type)
    };

    // Consumption targets
    const canScale = this.activity.canScale;
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
          { value: "", label: game.i18n.localize("DND5E.Consumption.Scaling.None") },
          { value: "amount", label: game.i18n.localize("DND5E.Consumption.Scaling.Amount") },
          ...(typeConfig.scalingModes ?? []).map(({ value, label }) => ({ value, label: game.i18n.localize(label) }))
        ] : null,
        showTargets: "validTargets" in typeConfig,
        targetPlaceholder: data.type === "itemUses" ? game.i18n.localize("DND5E.Consumption.Target.ThisItem") : null,
        validTargets: showTextTarget ? null : typeConfig.validTargets?.call(this.activity)
      };
    });

    // Uses recovery
    const usesRecoveryPeriods = [
      ...Object.entries(CONFIG.DND5E.limitedUsePeriods)
        .filter(([, config]) => !config.deprecated)
        .map(([value, config]) => ({
          value, label: config.label, group: game.i18n.localize("DND5E.DurationTime")
        })),
      { value: "recharge", label: game.i18n.localize("DND5E.USES.Recovery.Recharge.Label") }
    ];
    const usesRecoveryTypes = [
      { value: "recoverAll", label: game.i18n.localize("DND5E.USES.Recovery.Type.RecoverAll") },
      { value: "loseAll", label: game.i18n.localize("DND5E.USES.Recovery.Type.LoseAll") },
      { value: "formula", label: game.i18n.localize("DND5E.USES.Recovery.Type.Formula") }
    ];
    context.usesRecovery = context.activity.uses.recovery.map((data, index) => ({
      data,
      fields: this.activity.schema.fields.uses.fields.recovery.element.fields,
      prefix: `uses.recovery.${index}.`,
      source: context.source.uses.recovery[index] ?? data,
      periods: usesRecoveryPeriods,
      types: usesRecoveryTypes,
      formulaOptions: data.period === "recharge" ? data.recharge?.options : null
    }));

    // Template dimensions
    const sizes = CONFIG.DND5E.areaTargetTypes[context.activity.target.template.type]?.sizes;
    if ( sizes ) {
      context.dimensions = {
        size: "DND5E.AreaOfEffect.Size.Label",
        width: sizes.includes("width") && (sizes.includes("length") || sizes.includes("radius")),
        height: sizes.includes("height")
      };
      if ( sizes.includes("radius") ) context.dimensions.size = "DND5E.AreaOfEffect.Size.Radius";
      else if ( sizes.includes("length") ) context.dimensions.size = "DND5E.AreaOfEffect.Size.Length";
      else if ( sizes.includes("width") ) context.dimensions.size = "DND5E.AreaOfEffect.Size.Width";
      if ( sizes.includes("thickness") ) context.dimensions.width = "DND5E.AreaOfEffect.Size.Thickness";
      else if ( context.dimensions.width ) context.dimensions.width = "DND5E.AreaOfEffect.Size.Width";
      if ( context.dimensions.height ) context.dimensions.height = "DND5E.AreaOfEffect.Size.Height";
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the effect tab.
   * @param {object} context  Context being prepared.
   * @returns {object}
   */
  async _prepareEffectContext(context) {
    context.tab = context.tabs.effect;

    const appliedEffects = new Set(context.activity.effects.map(e => e.id));
    context.allEffects = this.item.effects.map(effect => ({
      value: effect.id, label: effect.name, selected: appliedEffects.has(effect.id)
    }));

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the identity tab.
   * @param {object} context  Context being prepared.
   * @returns {object}
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
            label: "DND5E.ACTIVITY.FIELDS.consumption.label"
          },
          targeting: {
            id: "activation-targeting", group: "activation", icon: "fa-solid fa-bullseye",
            label: "DND5E.ACTIVITY.FIELDS.target.label"
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
  }

  /* -------------------------------------------- */

  /** @override */
  _onClose(_options) {
    this.activity.constructor._unregisterApp(this.activity, this);
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

  /**
   * Handle adding a new entry to the consumption list.
   * @this {ActivityConfig}
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
   * Handle creating a new active effect and adding it to the applied effects list.
   * @this {ActivityConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #addEffect(event, target) {
    const effectData = {
      name: this.item.name,
      img: this.item.img,
      origin: this.item.uuid,
      transfer: false
    };
    const [created] = await this.item.createEmbeddedDocuments("ActiveEffect", [effectData]);
    this.activity.update({ effects: [...this.activity.toObject().effects, { id: created.id }] });
  }

  /* -------------------------------------------- */

  /**
   * Handle adding a new entry to the uses recovery list.
   * @this {ActivityConfig}
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
   * @this {ActivityConfig}
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
   * Handle deleting an active effect and removing it from the applied effects list.
   * @this {ActivityConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #deleteEffect(event, target) {
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    const result = await this.item.effects.get(effectId)?.deleteDialog();
    if ( result instanceof ActiveEffect ) {
      const effects = this.activity.toObject().effects.filter(e => e.id !== effectId);
      this.activity.update({ effects });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle removing an entry from the uses recovery list.
   * @this {ActivityConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #deleteRecovery(event, target) {
    const recovery = this.activity.toObject().uses.recovery;
    recovery.splice(target.closest("[data-index]").dataset.index, 1);
    this.activity.update({ "uses.recovery": recovery });
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
    if ( foundry.utils.hasProperty(submitData, "appliedEffects") ) {
      const effects = submitData.effects ?? this.activity.toObject().effects;
      submitData.effects = effects.filter(e => submitData.appliedEffects.includes(e.id));
      for ( const id of submitData.appliedEffects ) {
        if ( submitData.effects.find(e => e.id === id) ) continue;
        submitData.effects.push({ id });
      }
    }
    if ( foundry.utils.hasProperty(submitData, "consumption.targets") ) {
      submitData.consumption.targets = Object.values(submitData.consumption.targets);
    }
    if ( foundry.utils.hasProperty(submitData, "uses.recovery") ) {
      submitData.uses.recovery = Object.values(submitData.uses.recovery);
    }
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
