import { filteredKeys, simplifyBonus } from "../../utils.mjs";
import Application5e from "../api/application.mjs";

const { BooleanField, NumberField, StringField } = foundry.data.fields;

/**
 * Dialog for configuring the usage of an activity.
 */
export default class ActivityUsageDialog extends Application5e {
  constructor(options={}) {
    super(options);
    this.#activityId = options.activity.id;
    this.#item = options.activity.item;
    this.#config = options.config;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["activity-usage"],
    tag: "dialog",
    window: {
      title: "DND5E.AbilityUseConfig",
      icon: "",
      minimizable: false,
      contentTag: "form"
    },
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
  get subtitle() {
    return `${this.item.name}: ${this.activity.name}`;
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
  async _prepareContext(options) {
    if ( "scaling" in this.config ) this.#item = this.#item.clone({ "flags.dnd5e.scaling": this.config.scaling });
    return {
      ...await super._prepareContext(options),
      activity: this.activity
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = foundry.utils.deepClone(await super._preparePartContext(partId, context, options));
    switch ( partId ) {
      case "concentration": return this._prepareConcentrationContext(context, options);
      case "consumption": return this._prepareConsumptionContext(context, options);
      case "creation": return this._prepareCreationContext(context, options);
      case "footer": return this._prepareFooterContext(context, options);
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
        const data = effect.getFlag("dnd5e", "item.data");
        return {
          value: effect.id,
          label: data?.name ?? this.actor.items.get(data)?.name ?? game.i18n.localize("DND5E.ConcentratingItemless")
        };
      });
      if ( existingConcentration.length ) {
        const optional = existingConcentration.length < (this.actor.system.attributes?.concentration?.limit ?? 0);
        context.fields.push({
          field: new StringField({ label: game.i18n.localize("DND5E.ConcentratingEnd") }),
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

    if ( this.activity.requiresSpellSlot && this._shouldDisplay("consume.spellSlot") ) context.spellSlot = {
      field: new BooleanField({ label: game.i18n.localize("DND5E.SpellCastConsume") }),
      name: "consume.spellSlot",
      value: this.config.consume?.spellSlot
    };

    if ( this._shouldDisplay("consume.resources") ) {
      context.resources = [];
      const isArray = foundry.utils.getType(this.config.consume?.resources) === "Array";
      for ( const [index, target] of this.activity.consumption.targets.entries() ) {
        context.resources.push({
          field: new BooleanField(target.getConsumptionLabels(this.config)),
          name: `consume.resources.${index}`,
          value: (isArray && this.config.consume.resources.includes(index))
            || (!isArray && (this.config.consume?.resources !== false) && (this.config.consume !== false)),
          input: context.inputs.createCheckboxInput
        });
      }
    }

    context.hasConsumption = context.spellSlot || context.resources;

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

    if ( this.activity.requiresSpellSlot && (this.config.scaling !== false) ) {
      const minimumLevel = this.item.system.level ?? 1;
      const maximumLevel = Object.values(this.actor.system.spells)
        .reduce((max, d) => d.max ? Math.max(max, d.level) : max, 0);

      const spellSlotOptions = Object.entries(this.actor.system.spells).map(([value, slot]) => {
        if ( (slot.level < minimumLevel) || (slot.level > maximumLevel) || !slot.type ) return null;
        let label;
        if ( slot.type === "leveled" ) {
          label = game.i18n.format("DND5E.SpellLevelSlot", { level: slot.label, n: slot.value });
        } else {
          label = game.i18n.format(`DND5E.SpellLevel${slot.type.capitalize()}`, { level: slot.level, n: slot.value });
        }
        return { value, label, disabled: (slot.value === 0) && this.config.consume?.spellSlot };
      }).filter(o => o);

      if ( spellSlotOptions ) context.spellSlots = {
        field: new StringField({ label: game.i18n.localize("DND5E.SpellCastUpcast") }),
        name: "spell.slot",
        value: this.config.spell?.slot,
        options: spellSlotOptions
      };

      if ( !spellSlotOptions.some(o => !o.disabled) ) context.notes.push({
        type: "warn", message: game.i18n.format("DND5E.SpellCastNoSlotsLeft", {
          name: this.item.name
        })
      });
    }

    else if ( this.activity.consumption.scaling.allowed && (this.config.scaling !== false) ) {
      const scale = this.activity.consumption.scaling;
      const max = scale.max ? simplifyBonus(scale.max, this.activity.getRollData({ deterministic: true })) : Infinity;
      context.scaling = {
        field: new NumberField({ min: 1, max: max, label: game.i18n.localize("DND5E.ScalingValue") }),
        name: "scalingValue",
        // Config stores the scaling increase, but scaling value (increase + 1) is easier to understand in the UI
        value: Math.clamp((this.config.scaling ?? 0) + 1, 1, max),
        max,
        showRange: max <= 20
      };
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

  /** @inheritDoc */
  _attachFrameListeners() {
    super._attachFrameListeners();

    // Add event listeners to the form manually (see https://github.com/foundryvtt/foundryvtt/issues/11621)
    const form = this.element.querySelector("form");
    form.addEventListener("submit", this._onSubmitForm.bind(this, this.options.form));
    form.addEventListener("change", this._onChangeForm.bind(this, this.options.form));
  }

  /* -------------------------------------------- */

  /**
   * Handle form submission.
   * @this {ActivityUsageDialog}
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
   * Handle clicking the use button.
   * @this {ActivityUsageDialog}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #onUse(event, target) {
    const formData = new FormDataExtended(this.element.querySelector("form"));
    const submitData = this._prepareSubmitData(event, formData);
    foundry.utils.mergeObject(this.#config, submitData);
    this.#used = true;
    this.close();
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
    if ( foundry.utils.hasProperty(submitData, "spell.slot") ) {
      const level = this.actor.system.spells?.[submitData.spell.slot]?.level ?? 0;
      submitData.scaling = Math.max(0, level - this.item.system.level);
    } else if ( "scalingValue" in submitData ) {
      submitData.scaling = submitData.scalingValue - 1;
      delete submitData.scalingValue;
    }
    if ( foundry.utils.getType(submitData.consume?.resources) === "Object" ) {
      submitData.consume.resources = filteredKeys(submitData.consume.resources).map(i => Number(i));
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
