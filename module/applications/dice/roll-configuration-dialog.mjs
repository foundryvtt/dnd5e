import Application5e from "../api/application.mjs";

/**
 * Dialog rendering options for a roll configuration dialog.
 *
 * @typedef {object} BasicRollConfigurationDialogOptions
 * @property {typeof BasicRoll} rollType  Roll type to use when constructing final roll.
 * @property {object} [default]
 * @property {number} [default.rollMode]  Default roll mode to have selected.
 */

/**
 * Dialog for configuring one or more rolls.
 *
 * @param {BasicRollProcessConfiguration} [config={}]         Initial roll configuration.
 * @param {BasicRollMessageConfiguration} [message={}]        Message configuration.
 * @param {BasicRollConfigurationDialogOptions} [options={}]  Dialog rendering options.
 */
export default class RollConfigurationDialog extends Application5e {
  constructor(config={}, message={}, options={}) {
    super(options);

    this.#config = config;
    this.#message = message;
    this.#buildRolls(foundry.utils.deepClone(this.#config));
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
   * @type {typeof BasicRoll}
   */
  static get rollType() {
    return CONFIG.Dice.BasicRoll;
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Roll configuration.
   * @type {BasicRollProcessConfiguration}
   */
  #config;

  get config() {
    return this.#config;
  }

  /* -------------------------------------------- */

  /**
   * Configuration information for the roll message.
   * @type {BasicRollMessageConfiguration}
   */
  #message;

  get message() {
    return this.#message;
  }

  /* -------------------------------------------- */

  /**
   * The rolls being configured.
   * @type {BasicRoll[]}
   */
  #rolls;

  get rolls() {
    return this.#rolls;
  }

  /* -------------------------------------------- */

  /**
   * Roll type to use when constructing the rolls.
   * @type {typeof BasicRoll}
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
    switch ( partId ) {
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
   */
  #buildRolls(config, formData) {
    const RollType = this.rollType;
    this.#rolls = config.rolls?.map((config, index) =>
      RollType.fromConfig(this._buildConfig(config, formData, index))
    ) ?? [];
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
   * @this {RollConfigurationDialog}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
  static async #handleFormSubmission(event, form, formData) {
    this.#rolls = this._finalizeRolls(event.submitter?.dataset?.action);
    await this.close({ dnd5e: { submitted: true } });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);

    const formData = new FormDataExtended(this.element);
    if ( formData.has("rollMode") ) this.message.rollMode = formData.get("rollMode");
    this.#buildRolls(foundry.utils.deepClone(this.#config), formData);
    this.render({ parts: ["formulas"] });
  }

  /* -------------------------------------------- */

  /** @override */
  _onClose(options = {}) {
    if ( !options.dnd5e?.submitted ) this.#rolls = [];
  }

  /* -------------------------------------------- */
  /*  Constructor                                 */
  /* -------------------------------------------- */

  /**
   * A helper to handle displaying and responding to the dialog.
   * @param {BasicRollProcessConfiguration} [config]        Initial roll configuration.
   * @param {BasicRollConfigurationDialogOptions} [dialog]  Dialog configuration options.
   * @param {BasicRollMessageConfiguration} [message]       Message configuration.
   * @returns {Promise<BasicRoll[]>}
   */
  static async configure(config={}, dialog={}, message={}) {
    return new Promise(resolve => {
      const app = new this(config, message, dialog.options);
      app.addEventListener("close", () => resolve(app.rolls), { once: true });
      app.render({ force: true });
    });
  }
}
