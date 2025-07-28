import { filteredKeys, formatNumber, simplifyBonus } from "../../utils.mjs";
import Dialog5e from "../api/dialog.mjs";

const { BooleanField, NumberField, StringField } = foundry.data.fields;

/**
 * Dialog for configuring the usage of an activity.
 */
export default class ActivityUsageDialog extends Dialog5e {
  constructor(options={}) {
    super(options);
    this.#activityId = options.activity.id;
    this.#item = options.activity.item;
    this.#config = options.config;
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["activity-usage"],
    actions: {
      use: ActivityUsageDialog.#onUse
    },
    activity: null,
    button: {
      icon: null,
      label: null
    },
    config: null,
    display: {
      all: true
    },
    form: {
      handler: ActivityUsageDialog.#onSubmitForm,
      submitOnChange: true
    },
    position: {
      width: 420
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    scaling: {
      template: "systems/dnd5e/templates/activity/activity-usage-scaling.hbs"
    },
    concentration: {
      template: "systems/dnd5e/templates/activity/activity-usage-concentration.hbs"
    },
    consumption: {
      template: "systems/dnd5e/templates/activity/activity-usage-consumption.hbs"
    },
    creation: {
      template: "systems/dnd5e/templates/activity/activity-usage-creation.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * ID of the activity being activated.
   * @type {Activity}
   */
  #activityId;

  /**
   * Activity being activated.
   * @type {Activity}
   */
  get activity() {
    return this.item.system.activities.get(this.#activityId);
  }

  /* -------------------------------------------- */

  /**
   * Actor using this activity.
   * @type {Actor5e}
   */
  get actor() {
    return this.item.actor;
  }

  /* -------------------------------------------- */

  /**
   * Activity usage configuration data.
   * @type {ActivityUseConfiguration}
   */
  #config;

  get config() {
    return this.#config;
  }

  /* -------------------------------------------- */

  /**
   * Item that contains the activity.
   * @type {Item5e}
   */
  #item;

  get item() {
    return this.#item;
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return this.item.name;
  }

  /* -------------------------------------------- */

  /** @override */
  get subtitle() {
    return this.activity.name;
  }

  /* -------------------------------------------- */

  /**
   * Was the use button clicked?
   * @type {boolean}
   */
  #used = false;

  get used() {
    return this.#used;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if ( options.isFirstRender ) options.window.icon ||= this.activity.img;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    if ( "scaling" in this.config ) {
      this.#item = this.#item.clone({ "flags.dnd5e.scaling": this.config.scaling }, { keepId: true });
    }
    return {
      ...await super._prepareContext(options),
      activity: this.activity,
      linkedActivity: this.config.cause ? this.activity.getLinkedActivity(this.config.cause.activity) : null
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "concentration": return this._prepareConcentrationContext(context, options);
      case "consumption": return this._prepareConsumptionContext(context, options);
      case "creation": return this._prepareCreationContext(context, options);
      case "scaling": return this._prepareScalingContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the concentration section.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareConcentrationContext(context, options) {
    if ( !this.activity.requiresConcentration || game.settings.get("dnd5e", "disableConcentration")
      || !this._shouldDisplay("concentration") ) return context;
    context.hasConcentration = true;
    context.notes = [];

    context.fields = [{
      field: new BooleanField({ label: game.i18n.localize("DND5E.Concentration") }),
      name: "concentration.begin",
      value: this.config.concentration?.begin,
      input: context.inputs.createCheckboxInput
    }];
    if ( this.config.concentration?.begin ) {
      const existingConcentration = Array.from(this.actor.concentration.effects).map(effect => {
        const data = effect.getFlag("dnd5e", "item");
        return {
          value: effect.id,
          label: data?.data?.name ?? this.actor.items.get(data?.id)?.name
            ?? game.i18n.localize("DND5E.ConcentratingItemless")
        };
      });
      if ( existingConcentration.length ) {
        const optional = existingConcentration.length < (this.actor.system.attributes?.concentration?.limit ?? 0);
        context.fields.push({
          field: new StringField({
            required: true, label: game.i18n.localize("DND5E.ConcentratingEnd"), blank: optional
          }),
          name: "concentration.end",
          value: this.config.concentration?.end,
          options: optional ? [{ value: "", label: "—" }, ...existingConcentration] : existingConcentration
        });
        context.notes.push({
          type: "info", message: game.i18n.localize(`DND5E.ConcentratingWarnLimit${optional ? "Optional" : ""}`)
        });
      } else if ( !this.actor.system.attributes?.concentration?.limit ) {
        context.notes.push({
          type: "warn", message: game.i18n.localize("DND5E.ConcentratingWarnLimitZero")
        });
      }
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the consumption section.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareConsumptionContext(context, options) {
    context.fields = [];
    context.notes = [];

    const containsLegendaryConsumption = this.activity.consumption.targets
      .find(t => (t.type === "attribute") && (t.target === "resources.legact.value"));
    if ( (this.activity.activation.type === "legendary") && this.actor.system.resources?.legact
      && this._shouldDisplay("consume.action") && !containsLegendaryConsumption ) {
      const pr = new Intl.PluralRules(game.i18n.lang);
      const value = (this.config.consume !== false) && (this.config.consume?.action !== false);
      const warn = (this.actor.system.resources.legact.value < this.activity.activation.value) && value;
      context.fields.push({
        field: new BooleanField({
          label: game.i18n.format("DND5E.CONSUMPTION.Type.Action.Prompt", {
            type: game.i18n.localize("DND5E.LegendaryAction.Label")
          }),
          hint: game.i18n.format("DND5E.CONSUMPTION.Type.Action.PromptHint", {
            available: game.i18n.format(
              `DND5E.ACTIVATION.Type.Legendary.Counted.${pr.select(this.actor.system.resources.legact.value)}`,
              { number: `<strong>${formatNumber(this.actor.system.resources.legact.value)}</strong>` }
            ),
            cost: game.i18n.format(
              `DND5E.ACTIVATION.Type.Legendary.Counted.${pr.select(this.activity.activation.value)}`,
              { number: `<strong>${formatNumber(this.activity.activation.value)}</strong>` }
            )
          })
        }),
        input: context.inputs.createCheckboxInput,
        name: "consume.action",
        value, warn
      });
    }

    if ( this.activity.requiresSpellSlot && this.activity.consumption.spellSlot
      && this._shouldDisplay("consume.spellSlot") && !this.config.cause ) context.fields.push({
      field: new BooleanField({ label: game.i18n.localize("DND5E.SpellCastConsume") }),
      input: context.inputs.createCheckboxInput,
      name: "consume.spellSlot",
      value: this.config.consume?.spellSlot
    });

    if ( this._shouldDisplay("consume.resources") ) {
      const addResources = (targets, keyPath) => {
        const consume = foundry.utils.getProperty(this.config, keyPath);
        const isArray = foundry.utils.getType(consume) === "Array";
        for ( const [index, target] of targets.entries() ) {
          const value = (isArray && consume.includes(index))
            || (!isArray && (consume !== false) && (this.config.consume !== false));
          const { label, hint, notes, warn } = target.getConsumptionLabels(this.config, value);
          if ( notes?.length ) context.notes.push(...notes);
          context.fields.push({
            field: new BooleanField({ label, hint }),
            input: context.inputs.createCheckboxInput,
            name: `${keyPath}.${index}`,
            value,
            warn: value ? warn : false
          });
        }
      };
      addResources(this.activity.consumption.targets, "consume.resources");
      if ( context.linkedActivity && (!this.activity.isSpell || this.activity.consumption.spellSlot) ) {
        addResources(context.linkedActivity.consumption.targets, "cause.resources");
      }
    }

    context.hasConsumption = context.fields.length > 0;

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the creation section.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareCreationContext(context, options) {
    context.hasCreation = false;
    if ( this.activity.target?.template?.type && this._shouldDisplay("create.measuredTemplate") ) {
      context.hasCreation = true;
      context.template = {
        field: new BooleanField({ label: game.i18n.localize("DND5E.TARGET.Action.PlaceTemplate") }),
        name: "create.measuredTemplate",
        value: this.config.create?.measuredTemplate
      };
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the footer.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareFooterContext(context, options) {
    context.buttons = [{
      action: "use",
      icon: this.options.button.icon ?? `fa-solid fa-${this.activity.isSpell ? "magic" : "fist-raised"}`,
      label: this.options.button.label ?? `DND5E.AbilityUse${this.activity.isSpell ? "Cast" : "Use"}`,
      type: "button"
    }];
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the scaling section.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareScalingContext(context, options) {
    context.hasScaling = true;
    context.notes = [];
    if ( !this._shouldDisplay("scaling") ) {
      context.hasScaling = false;
      return context;
    }

    const scale = (context.linkedActivity ?? this.activity).consumption.scaling;
    const rollData = (context.linkedActivity ?? this.activity).getRollData({ deterministic: true });

    if ( this.activity.requiresSpellSlot && context.linkedActivity && (this.config.scaling !== false) ) {
      const max = simplifyBonus(scale.max, rollData);
      const minimumLevel = context.linkedActivity.spell?.level ?? this.item.system.level ?? 1;
      const maximumLevel = scale.allowed ? scale.max ? minimumLevel + max - 1 : Infinity : minimumLevel;
      const spellSlotOptions = Object.entries(CONFIG.DND5E.spellLevels).map(([level, label]) => {
        if ( (Number(level) < minimumLevel) || (Number(level) > maximumLevel) ) return null;
        return { value: `spell${level}`, label };
      }).filter(_ => _);
      context.spellSlots = {
        field: new StringField({ label: game.i18n.localize("DND5E.SpellCastUpcast") }),
        name: "spell.slot",
        value: this.config.spell?.slot,
        options: spellSlotOptions
      };
    }

    else if ( this.activity.requiresSpellSlot && (this.config.scaling !== false) ) {
      const minimumLevel = this.item.system.level ?? 1;
      const maximumLevel = Object.values(this.actor.system.spells)
        .reduce((max, d) => d.max ? Math.max(max, d.level) : max, 0);
      const spellMethod = CONFIG.DND5E.spellcasting[this.item.system.method];

      const consumeSlot = (this.config.consume === true) || this.config.consume?.spellSlot;
      let spellSlotValue = this.actor.system.spells[this.config.spell?.slot]?.value || !consumeSlot
        ? this.config.spell.slot : null;
      const spellSlotOptions = Object.entries(this.actor.system.spells).map(([value, slot]) => {
        if ( !slot.max || (slot.level < minimumLevel) || (slot.level > maximumLevel) || !slot.type ) return null;
        if ( spellMethod?.exclusive.spells && (this.item.system.method !== slot.type) ) return null;
        const model = CONFIG.DND5E.spellcasting[slot.type];
        if ( model?.exclusive.slots && (this.item.system.method !== slot.type) ) return null;
        const label = game.i18n.format(`DND5E.SpellLevel${slot.type.capitalize()}`, {
          level: model?.isSingleLevel ? slot.level : slot.label,
          n: slot.value
        });
        // Set current value if applicable.
        const disabled = (slot.value === 0) && consumeSlot;
        if ( !disabled && !spellSlotValue ) spellSlotValue = value;
        return { value, label, disabled, selected: spellSlotValue === value };
      }).filter(_ => _);

      context.spellSlots = {
        field: new StringField({ required: true, blank: false, label: game.i18n.localize("DND5E.SpellCastUpcast") }),
        name: "spell.slot",
        value: spellSlotValue,
        options: spellSlotOptions
      };

      if ( !spellSlotOptions.some(o => !o.disabled) ) context.notes.push({
        type: "warn", message: game.i18n.format("DND5E.SpellCastNoSlotsLeft", {
          name: this.item.name
        })
      });
    }

    else if ( scale.allowed && (this.config.scaling !== false) ) {
      const max = scale.max ? simplifyBonus(scale.max, rollData) : Infinity;
      if ( max > 1 ) context.scaling = {
        field: new NumberField({ min: 1, max, label: game.i18n.localize("DND5E.ScalingValue") }),
        name: "scalingValue",
        // Config stores the scaling increase, but scaling value (increase + 1) is easier to understand in the UI
        value: Math.clamp((this.config.scaling ?? 0) + 1, 1, max),
        max,
        showRange: max <= 20
      };
      else context.hasScaling = false;
    }

    else {
      context.hasScaling = false;
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Determine whether a particular element should be displayed based on the `display` options.
   * @param {string} section  Key path describing the section to be displayed.
   * @returns {boolean}
   */
  _shouldDisplay(section) {
    const display = this.options.display;
    if ( foundry.utils.hasProperty(display, section) ) return foundry.utils.getProperty(display, section);
    const [group] = section.split(".");
    if ( (group !== section) && (group in display) ) return display[group];
    return this.options.display.all ?? true;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle form submission.
   * @this {ActivityUsageDialog}
   * @param {SubmitEvent} event          Triggering submit event.
   * @param {HTMLFormElement} form       The form that was submitted.
   * @param {FormDataExtended} formData  Data from the submitted form.
   */
  static async #onSubmitForm(event, form, formData) {
    const submitData = await this._prepareSubmitData(event, formData);
    await this._processSubmitData(event, submitData);
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking the use button.
   * @this {ActivityUsageDialog}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #onUse(event, target) {
    const formData = new foundry.applications.ux.FormDataExtended(this.element.querySelector("form"));
    const submitData = await this._prepareSubmitData(event, formData);
    foundry.utils.mergeObject(this.#config, submitData);
    this.#used = true;
    this.close();
  }

  /* -------------------------------------------- */

  /**
   * Perform any pre-processing of the form data to prepare it for updating.
   * @param {SubmitEvent} event          Triggering submit event.
   * @param {FormDataExtended} formData  Data from the submitted form.
   * @returns {Promise<object>}
   */
  async _prepareSubmitData(event, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    if ( foundry.utils.hasProperty(submitData, "spell.slot") ) {
      submitData.spell.slot ||= this.#config.spell?.slot;
      const level = this.actor.system.spells?.[submitData.spell.slot]?.level ?? 0;
      submitData.scaling = Math.max(0, level - this.item.system.level);
    } else if ( "scalingValue" in submitData ) {
      submitData.scaling = submitData.scalingValue - 1;
      delete submitData.scalingValue;
    }
    for ( const key of ["consume", "cause"] ) {
      if ( foundry.utils.getType(submitData[key]?.resources) === "Object" ) {
        submitData[key].resources = filteredKeys(submitData[key].resources).map(i => Number(i));
      }
    }
    return submitData;
  }

  /* -------------------------------------------- */

  /**
   * Handle updating the usage configuration based on processed submit data.
   * @param {SubmitEvent} event  Triggering submit event.
   * @param {object} submitData  Prepared object for updating.
   */
  async _processSubmitData(event, submitData) {
    foundry.utils.mergeObject(this.#config, submitData);
    this.render();
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Display the activity usage dialog.
   * @param {Activity} activity                Activity to use.
   * @param {ActivityUseConfiguration} config  Configuration data for the usage.
   * @param {object} options                   Additional options for the application.
   * @returns {Promise<object|null>}           Form data object with results of the activation.
   */
  static async create(activity, config, options) {
    if ( !activity.item.isOwned ) throw new Error("Cannot activate an activity that is not owned.");

    return new Promise((resolve, reject) => {
      const dialog = new this({ activity, config, ...options });
      dialog.addEventListener("close", event => {
        if ( dialog.used ) resolve(dialog.config);
        else reject();
      }, { once: true });
      dialog.render({ force: true });
    });
  }
}
