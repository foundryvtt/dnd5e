import Application5e from "../api/application.mjs";

/**
 * Dialog rendering options for a roll configuration dialog.
 *
 * @typedef {object} BasicRollConfigurationDialogOptions
 * @property {typeof BasicRoll} rollType  Roll type to use when constructing final roll.
 * @property {object} [default]
 * @property {number} [default.rollMode]  Default roll mode to have selected.
 * @property {*} [resolve]                Method to call when resolving successfully.
 * @property {*} [reject]                 Method to call when the dialog is closed or process fails.
 */

/**
 * Dialog for configuring one or more rolls.
 *
 * @param {BasicRollProcessConfiguration} [config={}]          Initial roll configuration.
 * @param {BasicRollMessageConfiguration} [message={}]        Message configuration.
 * @param {BasicRollConfigurationDialogOptions} [options={}]  Dialog rendering options.
 */
export default class RollConfigurationDialog extends Application5e {
  constructor(config={}, message={}, options={}) {
    super(options);

    /**
     * Roll configuration.
     * @type {BasicRollProcessConfiguration}
     */
    Object.defineProperty(this, "config", { value: config, writable: false });

    this.message = message;
    this.rolls = this.#buildRolls(foundry.utils.deepClone(this.config));
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["roll-configuration"],
    tag: "form",
    window: {
      title: "DND5E.RollConfiguration.Title",
      icon: "fa-solid fa-dice",
      minimizable: false
    },
    form: {
      handler: RollConfigurationDialog.#handleFormSubmission
    },
    position: {
      width: 400
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    formulas: {
      template: "systems/dnd5e/templates/dice/roll-formulas.hbs"
    },
    configuration: {
      template: "systems/dnd5e/templates/dice/roll-configuration.hbs"
    },
    buttons: {
      template: "systems/dnd5e/templates/dice/roll-buttons.hbs"
    }
  };

  /* -------------------------------------------- */

  /**
   * Roll type to use when constructing the rolls.
   * @type {BasicRoll}
   */
  static get rollType() {
    return CONFIG.Dice.BasicRoll;
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Configuration information for the roll message.
   * @type {BasicRollMessageConfiguration}
   */
  message;

  /* -------------------------------------------- */

  /**
   * The rolls being configured.
   * @type {BasicRoll[]}
   */
  rolls;

  /* -------------------------------------------- */

  /**
   * Roll type to use when constructing the rolls.
   * @type {BasicRoll}
   */
  get rollType() {
    return this.options.rollType ?? this.constructor.rollType;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch (partId) {
      case "buttons":
        return this._prepareButtonsContext(context, options);
      case "configuration":
        return this._prepareConfigurationContext(context, options);
      case "formulas":
        return this._prepareFormulasContext(context, options);
      default:
        return context;
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for the buttons.
   * @param {ApplicationRenderContext} context  Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  _prepareButtonsContext(context, options) {
    context.buttons = {
      roll: {
        icon: '<i class="fa-solid fa-dice"></i>',
        label: game.i18n.localize("DND5E.Roll")
      }
    };
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for the roll configuration section.
   * @param {ApplicationRenderContext} context  Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  _prepareConfigurationContext(context, options) {
    context.rollMode = this.message.rollMode ?? this.options.default?.rollMode;
    context.rollModesOptions = CONFIG.Dice.rollModes;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for the formulas list.
   * @param {ApplicationRenderContext} context  Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  _prepareFormulasContext(context, options) {
    context.rolls = this.rolls;
    context.situational = this.rolls[0].data.situational;
    return context;
  }

  /* -------------------------------------------- */
  /*  Roll Handling                               */
  /* -------------------------------------------- */

  /**
   * Build a roll from the provided configuration objects.
   * @param {BasicRollProcessConfiguration} config  Roll configuration data.
   * @param {FormDataExtended} [formData]           Any data entered into the rolling prompt.
   * @returns {BasicRoll[]}
   * @private
   */
  #buildRolls(config, formData) {
    const RollType = this.rollType;
    return config.rolls?.map((config, index) => RollType.create(this._buildConfig(config, formData, index))) ?? [];
  }

  /* -------------------------------------------- */

  /**
   * Prepare individual configuration object before building a roll.
   * @param {BasicRollConfiguration} config  Roll configuration data.
   * @param {FormDataExtended} [formData]    Any data entered into the rolling prompt.
   * @param {number} index                   Index of the roll within all rolls being prepared.
   * @returns {BasicRollConfiguration}
   * @protected
   */
  _buildConfig(config, formData, index) {
    config = foundry.utils.mergeObject({ parts: [], data: {}, options: {} }, config);

    /**
     * A hook event that fires when a roll config is built using the roll prompt.
     * @function dnd5e.buildRollConfig
     * @memberof hookEvents
     * @param {RollConfigurationDialog} app    Roll configuration dialog.
     * @param {BasicRollConfiguration} config  Roll configuration data.
     * @param {FormDataExtended} [formData]    Any data entered into the rolling prompt.
     * @param {number} index                   Index of the roll within all rolls being prepared.
     */
    Hooks.callAll("dnd5e.buildRollConfig", this, config, formData, index);

    if ( formData?.get("situational") && (config.situational !== false) ) {
      config.parts.push("@situational");
      config.data.situational = formData.get("situational");
    }

    return config;
  }

  /* -------------------------------------------- */

  /**
   * Make any final modifications to rolls based on the button clicked.
   * @param {string} action  Action on the button clicked.
   * @returns {BasicRoll[]}
   * @protected
   */
  _finalizeRolls(action) {
    return this.rolls;
  }

  /* -------------------------------------------- */

  /**
   * Rebuild rolls based on an updated config and re-render the dialog.
   */
  rebuild() {
    this._onChangeForm(this.options.form, new Event("change"));
  }

  /* -------------------------------------------- */
  /*  Event Handling                              */
  /* -------------------------------------------- */

  /**
   * Handle submission of the dialog using the form buttons.
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   * @private
   */
  static async #handleFormSubmission(event, form, formData) {
    const rolls = this._finalizeRolls(event.submitter?.dataset?.action);
    await this.close({ dnd5e: { rolls } });
  }

  /* <><><><> <><><><> <><><><> <><><><> */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);

    const formData = new FormDataExtended(this.element);
    if (formData.has("rollMode")) this.message.rollMode = formData.get("rollMode");
    this.rolls = this.#buildRolls(foundry.utils.deepClone(this.config), formData);
    this.render({ parts: ["formulas"] });
  }

  /* <><><><> <><><><> <><><><> <><><><> */

  /** @override */
  _onClose(options = {}) {
    this.options.resolve?.(options[game.system.id]?.rolls ?? []);
  }

  /* -------------------------------------------- */
  /*  Constructor                                 */
  /* -------------------------------------------- */

  /**
   * A helper to handle displaying and responding to the dialog.
   * @param {BasicRollProcessConfiguration} [config]        Initial roll configuration.
   * @param {BasicRollConfigurationDialogOptions} [dialog]  Dialog configuration options.
   * @param {BasicRollMessageConfiguration} [message]       Message configuration.
   * @returns {Promise}
   */
  static async configure(config={}, dialog={}, message={}) {
    return new Promise((resolve, reject) => {
      new this(config, message, { ...(dialog.options ?? {}), resolve, reject }).render(true);
    });
  }
}
