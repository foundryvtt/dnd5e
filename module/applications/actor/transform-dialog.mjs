import TransformationSetting from "../../data/settings/transformation-setting.mjs";
import { filteredKeys } from "../../utils.mjs";
import Dialog5e from "../api/dialog.mjs";

/**
 * Dialog that controls transforming an actor using another actor.
 */
export default class TransformDialog extends Dialog5e {
  constructor(options) {
    super(options);
    this.#settings = this.options.transform.settings?.clone() ?? new TransformationSetting();
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      setPreset: TransformDialog.#setPreset
    },
    buttons: [{
      action: "submit",
      icon: "fa-solid fa-check",
      label: "DND5E.TRANSFORM.Action.Transform",
      type: "submit"
    }],
    classes: ["transformation"],
    form: {
      handler: TransformDialog.#handleFormSubmission,
      submitOnChange: true
    },
    position: {
      width: 1000
    },
    transform: {
      host: null,
      settings: null,
      source: null
    },
    window: {
      title: "DND5E.TRANSFORM.Dialog.Title",
      icon: "fa-solid fa-arrow-right-arrow-left",
      minimizable: true
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    details: {
      template: "systems/dnd5e/templates/apps/transform-details.hbs"
    },
    presets: {
      container: { id: "settings-area" },
      template: "systems/dnd5e/templates/apps/transform-presets.hbs"
    },
    settings: {
      container: { id: "settings-area" },
      template: "systems/dnd5e/templates/apps/transform-settings.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Settings that should be applied during transformation.
   * @param {TransformationSetting|null}
   */
  #settings = null;

  get settings() {
    return this.#settings;
  }

  /* -------------------------------------------- */

  /**
   * Was the transform button clicked?
   * @type {boolean}
   */
  #shouldTransform = false;

  get shouldTransform() {
    return this.#shouldTransform;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = { ...(await super._preparePartContext(partId, context, options)) };
    if ( partId === "details" ) return this._prepareDetailsContext(context, options);
    if ( partId === "presets" ) return this._preparePresetsContext(context, options);
    if ( partId === "settings" ) return this._prepareSettingsContext(context, options);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the details section.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareDetailsContext(context, options) {
    context.sourceActor = this.options.transform.source;
    context.hostActor = this.options.transform.host;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the presets section.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _preparePresetsContext(context, options) {
    context.presets = Object.entries(CONFIG.DND5E.transformation.presets).reduce((obj, [key, config]) => {
      obj[key] = {
        ...config,
        selected: this.#settings.preset === key
      };
      return obj;
    }, {});
    context.noneSelected = !this.#settings.preset;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the settings section.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareSettingsContext(context, options) {
    context.categories = this.#settings.createFormCategories();
    return context;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    this.#disableFields();
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Disable inputs based on other checked fields.
   * @param {CheckboxElement} [changed]  The recently changed checkbox, if any.
   */
  #disableFields(changed) {
    const handleDisable = field => {
      if ( field.disabled ) return;
      const config = foundry.utils.getProperty(CONFIG.DND5E.transformation, field.name);
      if ( !config?.disables?.length ) return;
      const names = config.disables.map(d => d.includes("*") ? `[name^="${d.replace("*", "")}"]` : `[name="${d}"]`);
      const selector = `:is(${names.join(",")}):not([name="${field.name}"])`;
      this.element.querySelectorAll(selector).forEach(element => {
        element.disabled = field.value;
        if ( element.disabled && element.tagName === "DND5E-CHECKBOX" ) element.checked = false;
        else if ( element.disabled ) element.value = "";
      });
    };
    if ( changed ) handleDisable(changed);
    else this.element.querySelectorAll("dnd5e-checkbox").forEach(e => handleDisable(e));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    if ( event.target?.tagName === "DND5E-CHECKBOX" ) this.#disableFields(event.target);
    super._onChangeForm(formConfig, event);
  }

  /* -------------------------------------------- */

  /**
   * Handle applying a preset to the settings.
   * @this {TransformDialog}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #setPreset(event, target) {
    const preset = CONFIG.DND5E.transformation.presets[target.dataset.preset];
    if ( preset ) this.#settings = new TransformationSetting({
      ...preset.settings,
      preset: target.dataset.preset,
      transformTokens: this.element.querySelector('[name="transformTokens"]').checked
    });
    else this.#settings = new TransformationSetting();
    this.render({ parts: ["presets", "settings"] });
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Handle updating the preset display when fields are changes and transforming when the submit button is pressed.
   * @this {TransformDialog}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
  static async #handleFormSubmission(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    for ( const category of ["keep", "merge", "effects", "other"] ) {
      this.#settings.updateSource({ [category]: filteredKeys(data[category] ?? {}) });
      delete data[category];
    }
    this.#settings.updateSource(data);
    if ( event.type === "submit" ) {
      this.#shouldTransform = true;
      this.close();
    }
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Display the transform dialog.
   * @param {Actor5e} host                           Actor that will be transformed.
   * @param {Actor5e} source                         Actor whose data will be applied to the host.
   * @param {object} [options={}]                    Additional options for the application.
   * @returns {Promise<TransformationSetting|null>}  Transformation settings to apply.
   */
  static async promptSettings(host, source, options={}) {
    return new Promise(resolve => {
      options.transform ??= {};
      options.transform.host = host;
      options.transform.source = source;
      const dialog = new this(options);
      dialog.addEventListener("close", event =>
        resolve(dialog.shouldTransform ? dialog.settings : null)
      , { once: true });
      dialog.render({ force: true });
    });
  }
}
