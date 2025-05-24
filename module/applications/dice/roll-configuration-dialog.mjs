import Dialog5e from "../api/dialog.mjs";

const { DiceTerm } = foundry.dice.terms;

/**
 * Dialog rendering options for a roll configuration dialog.
 *
 * @typedef {object} BasicRollConfigurationDialogOptions
 * @property {typeof BasicRoll} rollType              Roll type to use when constructing final roll.
 * @property {object} [default]
 * @property {number} [default.rollMode]              Default roll mode to have selected.
 * @property {RollBuildConfigCallback} [buildConfig]  Callback to handle additional build configuration.
 * @property {BasicRollConfigurationDialogRenderOptions} [rendering]
 */

/**
 * @callback RollBuildConfigCallback
 * @param {BasicRollProcessConfiguration} process  Configuration for the entire rolling process.
 * @param {BasicRollConfiguration} config          Configuration for a specific roll.
 * @param {FormDataExtended} [formData]            Any data entered into the rolling prompt.
 * @param {number} index                           Index of the roll within all rolls being prepared.
 */

/**
 * @typedef BasicRollConfigurationDialogRenderOptions
 * @property {object} [dice]
 * @property {number} [dice.max=5]               The maximum number of dice to display in the large dice breakdown. If
 *                                               the given rolls contain more dice than this, then the large breakdown
 *                                               is not shown.
 * @property {Set<string>} [dice.denominations]  Valid die denominations to display in the large dice breakdown. If any
 *                                               of the given rolls contain an invalid denomination, then the large
 *                                               breakdown is not shown.
 */

/**
 * Dialog for configuring one or more rolls.
 *
 * @param {BasicRollProcessConfiguration} [config={}]         Initial roll configuration.
 * @param {BasicRollMessageConfiguration} [message={}]        Message configuration.
 * @param {BasicRollConfigurationDialogOptions} [options={}]  Dialog rendering options.
 */
export default class RollConfigurationDialog extends Dialog5e {
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
    window: {
      title: "DND5E.RollConfiguration.Title",
      icon: "fa-solid fa-dice"
    },
    form: {
      handler: RollConfigurationDialog.#handleFormSubmission
    },
    position: {
      width: 400
    },
    buildConfig: null,
    rendering: {
      dice: {
        max: 5,
        denominations: new Set(["d4", "d6", "d8", "d10", "d12", "d20"])
      }
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

  /**
   * Identify DiceTerms in this app's rolls.
   * @returns {{ icon: string, label: string }[]}
   * @protected
   */
  _identifyDiceTerms() {
    let dice = [];
    let shouldDisplay = true;

    /**
     * Determine if a given term is displayable.
     * @param {RollTerm} term  The term.
     * @returns {boolean|void}
     */
    const identifyTerm = term => {
      if ( !(term instanceof DiceTerm) ) return;
      // If any of the terms have complex components, do not attempt to display only some dice, bail out entirely.
      if ( !Number.isFinite(term.number) || !Number.isFinite(term.faces) ) return shouldDisplay = false;
      // If any of the terms are of an unsupported denomination, do not attempt to display only some dice, bail out
      // entirely.
      if ( !this.options.rendering.dice.denominations.has(term.denomination) ) return shouldDisplay = false;
      for ( let i = 0; i < term.number; i++ ) dice.push({
        icon: `systems/dnd5e/icons/svg/dice/${term.denomination}.svg`,
        label: term.denomination,
        denomination: term.denomination
      });
    };

    /**
     * Identify any DiceTerms in the given terms.
     * @param {RollTerm[]} terms  The terms.
     */
    const identifyDice = (terms=[]) => {
      for ( const term of terms ) {
        identifyTerm(term);
        if ( "dice" in term ) identifyDice(term.dice);
      }
    };

    this.rolls.forEach(roll => identifyDice(roll.terms));
    if ( dice.length > this.options.rendering.dice.max ) {
      // Compact dice display.
      const byDenom = dice.reduce((obj, { icon, denomination }) => {
        obj[denomination] ??= { icon, count: 0 };
        obj[denomination].count++;
        return obj;
      }, {});
      dice = Object.entries(byDenom).map(([d, { icon, count }]) => ({ icon, label: `${count}${d}` }));
      if ( dice.length > this.options.rendering.dice.max ) shouldDisplay = false;
    }
    else if ( !dice.length ) shouldDisplay = false;
    return shouldDisplay ? dice : [];
  }

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
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareButtonsContext(context, options) {
    context.buttons = {
      roll: {
        default: true,
        icon: '<i class="fa-solid fa-dice" inert></i>',
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
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareConfigurationContext(context, options) {
    context.fields = [{
      field: new foundry.data.fields.StringField({
        label: game.i18n.localize("DND5E.RollMode"), blank: false, required: true
      }),
      name: "rollMode",
      value: this.message.rollMode ?? this.options.default?.rollMode ?? game.settings.get("core", "rollMode"),
      options: Object.entries(CONFIG.Dice.rollModes)
        .map(([value, l]) => ({ value, label: game.i18n.localize(l.label) }))
    }];
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for the formulas list.
   * @param {ApplicationRenderContext} context  Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareFormulasContext(context, options) {
    context.rolls = this.rolls.map(roll => ({ roll }));
    context.dice = this._identifyDiceTerms() || [];
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
      RollType.fromConfig(this._buildConfig(config, formData, index), this.config)
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
     * A hook event that fires when a roll config is built using the roll prompt. Multiple hooks may be called depending
     * on the rolling method (e.g. `dnd5e.buildSkillRollConfig`, `dnd5e.buildAbilityCheckRollConfig`,
     * `dnd5e.buildRollConfig`).
     * @function dnd5e.buildRollConfig
     * @memberof hookEvents
     * @param {RollConfigurationDialog} app    Roll configuration dialog.
     * @param {BasicRollConfiguration} config  Roll configuration data.
     * @param {FormDataExtended} [formData]    Any data entered into the rolling prompt.
     * @param {number} index                   Index of the roll within all rolls being prepared.
     */
    for ( const hookName of this.#config.hookNames ?? [""] ) {
      Hooks.callAll(`dnd5e.build${hookName.capitalize()}RollConfig`, this, config, formData, index);
    }

    const situational = formData?.get(`roll.${index}.situational`);
    if ( situational && (config.situational !== false) ) {
      config.parts.push("@situational");
      config.data.situational = situational;
    } else {
      config.parts.findSplice(v => v === "@situational");
    }

    this.options.buildConfig?.(this.config, config, formData, index);

    /**
     * A hook event that fires after a roll config has been built using the roll prompt. Multiple hooks may be called
     * depending on the rolling method (e.g. `dnd5e.postBuildSkillRollConfig`, `dnd5e.postBuildAbilityCheckRollConfig`,
     * `dnd5e.postBuildRollConfig`).
     * @function dnd5e.postBuildRollConfig
     * @memberof hookEvents
     * @param {BasicRollProcessConfiguration} process  Full process configuration data.
     * @param {BasicRollConfiguration} config          Roll configuration data.
     * @param {number} index                           Index of the roll within all rolls being prepared.
     * @param {object} [options]
     * @param {RollConfigurationDialog} [options.app]  Roll configuration dialog.
     * @param {FormDataExtended} [options.formData]    Any data entered into the rolling prompt.
     */
    for ( const hookName of this.#config.hookNames ?? [""] ) {
      Hooks.callAll(`dnd5e.postBuild${hookName.capitalize()}RollConfig`, this.config, config, index, {
        app: this, formData
      });
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
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle submission of the dialog using the form buttons.
   * @this {RollConfigurationDialog}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
  static async #handleFormSubmission(event, form, formData) {
    if ( formData.has("rollMode") ) this.message.rollMode = formData.get("rollMode");
    this.#rolls = this._finalizeRolls(event.submitter?.dataset?.action);
    await this.close({ dnd5e: { submitted: true } });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);

    const formData = new foundry.applications.ux.FormDataExtended(this.form);
    if ( formData.has("rollMode") ) this.message.rollMode = formData.get("rollMode");
    this.#buildRolls(foundry.utils.deepClone(this.#config), formData);
    this.render({ parts: ["formulas"] });
  }

  /* -------------------------------------------- */

  /** @override */
  _onClose(options={}) {
    if ( !options.dnd5e?.submitted ) this.#rolls = [];
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * A helper to handle displaying and responding to the dialog.
   * @param {BasicRollProcessConfiguration} [config]   Initial roll configuration.
   * @param {BasicRollDialogConfiguration} [dialog]    Dialog configuration options.
   * @param {BasicRollMessageConfiguration} [message]  Message configuration.
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
