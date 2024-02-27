import RollConfigurationDialog from "../applications/dice/roll-configuration-dialog.mjs";

/**
 * Configuration data for the process of creating one or more basic rolls.
 *
 * @typedef {object} BasicRollProcessConfiguration
 * @property {BasicRollConfiguration[]} rolls  Configuration data for individual rolls.
 * @property {Event} [event]                   Event that triggered the rolls.
 * @property {Document} [origin]               Document that initiated this roll.
 */

/**
 * Configuration data for an individual roll.
 *
 * @typedef {object} BasicRollConfiguration
 * @property {string[]} [parts=[]]         Parts used to construct the roll formula.
 * @property {object} [data={}]            Data used to resolve placeholders in the formula.
 * @property {boolean} [situational=true]  Whether the situational bonus can be added to this roll in the prompt.
 * @property {BasicRollOptions} [options]  Additional options passed through to the created roll.
 */

/**
 * Options allowed on a basic roll.
 *
 * @typedef {object} BasicRollOptions
 * @property {number} [target]  The total roll result that must be met for the roll to be considered a success.
 */

/* -------------------------------------------- */

/**
 * Configuration data for the roll prompt.
 *
 * @typedef {object} BasicRollDialogConfiguration
 * @property {boolean} [configure=true]  Display a configuration dialog for the rolling process.
 * @property {typeof RollConfigurationDialog} [applicationClass]  Alternate configuration application to use.
 * @property {BasicRollConfigurationDialogOptions} [options]      Additional options passed to the dialog.
 */

/* -------------------------------------------- */

/**
 * Configuration data for creating a roll message.
 *
 * @typedef {object} BasicRollMessageConfiguration
 * @property {boolean} [create=true]  Create a message when the rolling is complete.
 * @property {string} [rollMode]      The roll mode to apply to this message from `CONFIG.Dice.rollModes`.
 * @property {object} [data={}]       Additional data used when creating the message.
 */

/* -------------------------------------------- */

/**
 * Custom base roll type with methods for building rolls, presenting prompts, and creating messages.
 */
export default class BasicRoll extends Roll {

  /**
   * Default application used for the roll configuration prompt.
   * @type {typeof RollConfigurationDialog}
   */
  static DefaultConfigurationDialog = RollConfigurationDialog;

  /* -------------------------------------------- */
  /*  Static Construction                         */
  /* -------------------------------------------- */

  /**
   * Create a roll instance from a roll config.
   * @param {BasicRollConfiguration} config  Configuration info for the roll.
   * @returns {BasicRoll}
   */
  static create(config) {
    const formula = (config.parts ?? []).join(" + ");
    return new this(formula, config.data, config.options);
  }

  /* -------------------------------------------- */

  /**
   * Construct and perform a roll through the standard workflow.
   * @param {BasicRollProcessConfiguration} [config={}]   Configuration for the rolls.
   * @param {BasicRollDialogConfiguration} [dialog={}]    Configuration for roll prompt.
   * @param {BasicRollMessageConfiguration} [message={}]  Configuration for message creation.
   * @returns {BasicRoll[]}
   */
  static async build(config={}, dialog={}, message={}) {
    this.applyKeybindings(config, dialog, message);

    let rolls;
    if ( dialog.configure !== false ) {
      let DialogClass = dialog.applicationClass ?? this.DefaultConfigurationDialog;
      rolls = await DialogClass.configure(config, dialog, message);
    } else {
      rolls = config.rolls?.map(config => this.create(config)) ?? [];
    }

    for ( const roll of rolls ) await roll.evaluate();

    if ( rolls?.length && (message.create !== false) ) {
      await this.toMessage(rolls, message.data, {
        rollMode: message.rollMode ?? rolls.reduce(r => mode ?? r.options.rollMode)
      });
    }

    return rolls;
  }

  /* -------------------------------------------- */

  /**
   * Determines whether the roll process should be fast forwarded.
   * @param {BasicRollProcessConfiguration} config   Roll configuration data.
   * @param {BasicRollDialogConfiguration} dialog    Data for the roll configuration dialog.
   * @param {BasicRollMessageConfiguration} message  Message configuration data.
   */
  static applyKeybindings(config, dialog, message) {
    dialog.configure ??= true;
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Is the result of this roll a failure? Returns `undefined` if roll isn't evaluated.
   * @type {boolean|void}
   */
  get isFailure() {
    if ( !this._evaluated ) return undefined;
    if ( !Number.isNumeric(this.options.target) ) return false;
    return this.total < this.options.target;
  }

  /* -------------------------------------------- */

  /**
   * Is the result of this roll a success? Returns `undefined` if roll isn't evaluated.
   * @type {boolean|void}
   */
  get isSuccess() {
    if ( !this._evaluated ) return undefined;
    if ( !Number.isNumeric(this.options.target) ) return false;
    return this.total >= this.options.target;
  }

  /* -------------------------------------------- */
  /*  Chat Messages                               */
  /* -------------------------------------------- */

  /**
   * Transform a Roll instance into a ChatMessage, displaying the roll result.
   * This function can either create the ChatMessage directly, or return the data object that will be used to create.
   *
   * @param {BasicRoll[]} rolls              Rolls to add to the message.
   * @param {object} messageData             The data object to use when creating the message
   * @param {options} [options]              Additional options which modify the created message.
   * @param {string} [options.rollMode]      The template roll mode to use for the message from CONFIG.Dice.rollModes
   * @param {boolean} [options.create=true]  Whether to automatically create the chat message, or only return the
   *                                         prepared chatData object.
   * @returns {Promise<ChatMessage|object>}  A promise which resolves to the created ChatMessage document if create is
   *                                         true, or the Object of prepared chatData otherwise.
   */
  static async toMessage(rolls, messageData={}, { rollMode, create=true }={}) {
    for ( const roll of rolls ) {
      if ( !roll._evaluated ) await roll.evaluate({async: true});
    }

    // Prepare chat data
    messageData = foundry.utils.mergeObject({
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice
    }, messageData);
    messageData.rolls = rolls;

    // Process the chat data
    const cls = getDocumentClass("ChatMessage");
    const msg = new cls(messageData);

    // Either create or return the data
    if ( create ) return cls.create(msg.toObject(), { rollMode });
    else {
      if ( rollMode ) msg.applyRollMode(rollMode);
      return msg.toObject();
    }
  }
}
