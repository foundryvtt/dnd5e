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
export default class RollConfigurationDialog extends FormApplication {
  constructor(config={}, message={}, options={}) {
    super(null, options);

    /**
     * Roll configuration.
     * @type {BasicRollProcessConfiguration}
     */
    Object.defineProperty(this, "config", { value: config, writable: false });

    this.message = message;
    this.object = this._buildRolls(foundry.utils.deepClone(this.config));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/dice/roll-configuration-dialog.hbs",
      title: "DND5E.RollConfiguration.Title",
      classes: ["dnd5e", "dialog", "roll"],
      width: 400,
      submitOnChange: true,
      closeOnSubmit: false,
      jQuery: false,
      rollType: CONFIG.Dice.BasicRoll
    });
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
  get rolls() {
    return this.object;
  }

  set rolls(rolls) {
    this.object = rolls;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Buttons displayed in the configuration dialog.
   * @returns {object}
   * @protected
   */
  _getButtons() {
    return {
      roll: { label: game.i18n.localize("DND5E.Roll") }
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData(options={}) {
    return foundry.utils.mergeObject({
      CONFIG: CONFIG.DND5E,
      rolls: this.rolls,
      rollMode: this.message.rollMode ?? this.options.default?.rollMode,
      rollModes: CONFIG.Dice.rollModes,
      situational: this.rolls[0].data.situational,
      buttons: this._getButtons()
    }, super.getData(options));
  }

  /* -------------------------------------------- */
  /*  Roll Handling                               */
  /* -------------------------------------------- */

  /**
   * Build a roll from the provided configuration objects.
   * @param {BasicRollProcessConfiguration} config  Roll configuration data.
   * @param {object} [formData={}]                  Any data entered into the rolling prompt.
   * @returns {BasicRoll[]}
   * @internal
   */
  _buildRolls(config, formData={}) {
    const RollType = this.options.rollType ?? CONFIG.Dice.BasicRoll;
    return config.rolls?.map((config, index) => RollType.create(this._buildConfig(config, formData, index))) ?? [];
  }

  /* -------------------------------------------- */

  /**
   * Prepare individual configuration object before building a roll.
   * @param {BasicRollConfiguration} config  Roll configuration data.
   * @param {object} formData                Any data entered into the rolling prompt.
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
     * @param {object} formData                Any data entered into the rolling prompt.
     * @param {number} index                   Index of the roll within all rolls being prepared.
     */
    Hooks.callAll("dnd5e.buildRollConfig", this, config, formData, index);

    if ( formData.situational && (config.situational !== false) ) {
      config.parts.push("@situational");
      config.data.situational = formData.situational;
    }

    return config;
  }

  /* -------------------------------------------- */

  /**
   * Make any final modifications to rolls based on the button clicked.
   * @param {string} action  Action on the button clicked.
   * @returns {BasicRoll[]}
   */
  _finalizeRolls(action) {
    return this.rolls;
  }

  /* -------------------------------------------- */
  /*  Event Handling                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async close(options={}) {
    this.options.resolve?.([]);
    return super.close(options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _updateObject(event, formData) {
    if ( formData.rollMode ) this.message.rollMode = formData.rollMode;

    // If one of the buttons was clicked, finalize the roll, resolve the promise, and close
    if ( event.type === "submit" ) {
      const rolls = this._finalizeRolls(event.submitter?.dataset.action);
      this.options.resolve?.(rolls);
      this.close({ submit: false, force: true });
    }

    // Otherwise, re-build the in-memory rolls and re-render the dialog
    else {
      this.rolls = this._buildRolls(foundry.utils.deepClone(this.config), formData);
      this.render();
    }
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
