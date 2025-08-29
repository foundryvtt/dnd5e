import RollConfigurationDialog from "../applications/dice/roll-configuration-dialog.mjs";

const { DiceTerm, NumericTerm } = foundry.dice.terms;

/**
 * Configuration data for the process of creating one or more basic rolls.
 *
 * @typedef {object} BasicRollProcessConfiguration
 * @property {BasicRollConfiguration[]} rolls  Configuration data for individual rolls.
 * @property {boolean} [evaluate=true]         Should the rolls be evaluated? If set to `false`, then no chat message
 *                                             will be created regardless of message configuration.
 * @property {Event} [event]                   Event that triggered the rolls.
 * @property {string[]} [hookNames]            Name suffixes for configuration hooks called.
 * @property {Document} [subject]              Document that initiated this roll.
 * @property {number} [target]                 Default target value for all rolls.
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
 * @property {boolean} [create=true]     Create a message when the rolling is complete.
 * @property {ChatMessage5e} [document]  Final created chat message document once process is completed.
 * @property {string} [rollMode]         The roll mode to apply to this message from `CONFIG.Dice.rollModes`.
 * @property {object} [data={}]          Additional data used when creating the message.
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
   * @param {BasicRollConfiguration} config          Configuration info for the roll.
   * @param {BasicRollProcessConfiguration} process  Configuration info for the whole rolling process.
   * @returns {BasicRoll}
   */
  static fromConfig(config, process) {
    const formula = (config.parts ?? []).join(" + ");
    config.options ??= {};
    config.options.target ??= process.target;
    return new this(formula, config.data, config.options);
  }

  /* -------------------------------------------- */

  /**
   * Construct roll parts and populate its data object.
   * @param {object} parts   Information on the parts to be constructed.
   * @param {object} [data]  Roll data to use and populate while constructing the parts.
   * @returns {{ parts: string[], data: object }}
   */
  static constructParts(parts, data={}) {
    const finalParts = [];
    for ( const [key, value] of Object.entries(parts) ) {
      if ( !value && (value !== 0) ) continue;
      finalParts.push(`@${key}`);
      foundry.utils.setProperty(
        data, key, foundry.utils.getType(value) === "string" ? Roll.replaceFormulaData(value, data) : value
      );
    }
    return { parts: finalParts, data };
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
    const rolls = await this.buildConfigure(config, dialog, message);
    await this.buildEvaluate(rolls, config, message);
    await this.buildPost(rolls, config, message);
    return rolls;
  }

  /* -------------------------------------------- */

  /**
   * Stage one of the standard rolling workflow, configuring the roll.
   * @param {BasicRollProcessConfiguration} [config={}]   Configuration for the rolls.
   * @param {BasicRollDialogConfiguration} [dialog={}]    Configuration for roll prompt.
   * @param {BasicRollMessageConfiguration} [message={}]  Configuration for message creation.
   * @returns {Promise<BasicRoll[]>}
   */
  static async buildConfigure(config={}, dialog={}, message={}) {
    config.hookNames = [...(config.hookNames ?? []), ""];

    /**
     * A hook event that fires before a roll is performed. Multiple hooks may be called depending on the rolling
     * method (e.g. `dnd5e.preRollSkill`, `dnd5e.preRollAbilityCheck`, `dnd5e.preRoll`). Exact contents of the
     * configuration object will also change based on the roll type, but the same objects will always be present.
     * @function dnd5e.preRoll
     * @memberof hookEvents
     * @param {BasicRollProcessConfiguration} config   Configuration data for the pending roll.
     * @param {BasicRollDialogConfiguration} dialog    Presentation data for the roll configuration dialog.
     * @param {BasicRollMessageConfiguration} message  Configuration data for the roll's message.
     * @returns {boolean}                              Explicitly return `false` to prevent the roll.
     */
    for ( const hookName of config.hookNames ) {
      if ( Hooks.call(`dnd5e.preRoll${hookName.capitalize()}`, config, dialog, message) === false ) return [];
      if ( Hooks.call(`dnd5e.preRoll${hookName.capitalize()}V2`, config, dialog, message) === false ) return [];
    }

    this.applyKeybindings(config, dialog, message);

    let rolls;
    if ( dialog.configure === false ) {
      rolls = config.rolls?.map((r, index) => {
        dialog.options?.buildConfig?.(config, r, null, index);
        for ( const hookName of config.hookNames ) {
          Hooks.callAll(`dnd5e.postBuild${hookName.capitalize()}RollConfig`, config, r, index);
        }
        return this.fromConfig(r, config);
      }) ?? [];
    } else {
      const DialogClass = dialog.applicationClass ?? this.DefaultConfigurationDialog;
      rolls = await DialogClass.configure(config, dialog, message);
    }

    // Store the roll type in roll.options so it can be accessed from only the roll
    const rollType = foundry.utils.getProperty(message, "data.flags.dnd5e.roll.type");
    if ( rollType ) rolls.forEach(roll => roll.options.rollType ??= rollType);

    /**
     * A hook event that fires after roll configuration is complete, but before the roll is evaluated.
     * Multiple hooks may be called depending on the rolling method (e.g. `dnd5e.postSkillCheckRollConfiguration`,
     * `dnd5e.postAbilityTestRollConfiguration`, and `dnd5e.postRollConfiguration` for skill checks). Exact contents of
     * the configuration object will also change based on the roll type, but the same objects will always be present.
     * @function dnd5e.postRollConfiguration
     * @memberof hookEvents
     * @param {BasicRoll[]} rolls                      Rolls that have been constructed but not evaluated.
     * @param {BasicRollProcessConfiguration} config   Configuration information for the roll.
     * @param {BasicRollDialogConfiguration} dialog    Configuration for the roll dialog.
     * @param {BasicRollMessageConfiguration} message  Configuration for the roll message.
     * @returns {boolean}                              Explicitly return `false` to prevent rolls.
     */
    for ( const hookName of config.hookNames ) {
      const name = `dnd5e.post${hookName.capitalize()}RollConfiguration`;
      if ( Hooks.call(name, rolls, config, dialog, message) === false ) return [];
    }

    return rolls;
  }

  /* -------------------------------------------- */

  /**
   * Stage two of the standard rolling workflow, evaluating the rolls.
   * @param {BasicRoll[]} rolls                           Rolls to evaluate.
   * @param {BasicRollProcessConfiguration} [config={}]   Configuration for the rolls.
   * @param {BasicRollMessageConfiguration} [message={}]  Configuration for message creation.
   */
  static async buildEvaluate(rolls, config={}, message={}) {
    if ( config.evaluate !== false ) {
      for ( const roll of rolls ) await roll.evaluate();
    }
  }

  /* -------------------------------------------- */

  /**
   * Stage three of the standard rolling workflow, posting a message to chat.
   * @param {BasicRoll[]} rolls                      Rolls to evaluate.
   * @param {BasicRollProcessConfiguration} config   Configuration for the rolls.
   * @param {BasicRollMessageConfiguration} message  Configuration for message creation.
   * @returns {ChatMessage5e|void}
   */
  static async buildPost(rolls, config, message) {
    message.data = foundry.utils.expandObject(message.data ?? {});
    const messageId = config.event?.target.closest("[data-message-id]")?.dataset.messageId;
    if ( messageId ) foundry.utils.setProperty(message.data, "flags.dnd5e.originatingMessage", messageId);

    if ( rolls?.length && (config.evaluate !== false) ) {
      message[message.create !== false ? "document" : "data"] = await this.toMessage(
        rolls, message.data, { create: message.create, rollMode: message.rollMode }
      );
      if ( message.document ) rolls.forEach(r => r.parent = message.document);
    }

    return message.document;
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
    if ( !this._evaluated ) return;
    if ( !Number.isNumeric(this.options.target) ) return false;
    return this.total < this.options.target;
  }

  /* -------------------------------------------- */

  /**
   * Is the result of this roll a success? Returns `undefined` if roll isn't evaluated.
   * @type {boolean|void}
   */
  get isSuccess() {
    if ( !this._evaluated ) return;
    if ( !Number.isNumeric(this.options.target) ) return false;
    return this.total >= this.options.target;
  }

  /* -------------------------------------------- */
  /*  Chat Messages                               */
  /* -------------------------------------------- */

  /**
   * Transform a Roll instance into a ChatMessage, displaying the roll result.
   * This function can either create the ChatMessage directly, or return the data object that will be used to create it.
   *
   * @param {BasicRoll[]} rolls              Rolls to add to the message.
   * @param {object} messageData             The data object to use when creating the message.
   * @param {options} [options]              Additional options which modify the created message.
   * @param {string} [options.rollMode]      The template roll mode to use for the message from CONFIG.Dice.rollModes
   * @param {boolean} [options.create=true]  Whether to automatically create the chat message, or only return the
   *                                         prepared chatData object.
   * @returns {Promise<ChatMessage|object>}  A promise which resolves to the created ChatMessage document if create is
   *                                         true, or the Object of prepared chatData otherwise.
   */
  static async toMessage(rolls, messageData={}, { rollMode, create=true }={}) {
    for ( const roll of rolls ) {
      if ( !roll._evaluated ) await roll.evaluate({ allowInteractive: rollMode !== CONST.DICE_ROLL_MODES.BLIND });
      rollMode ??= roll.options.rollMode;
    }
    rollMode ??= game.settings.get("core", "rollMode");

    // Prepare chat data
    messageData = foundry.utils.mergeObject({ sound: CONFIG.sounds.dice }, messageData);
    this._prepareMessageData(rolls, messageData);
    messageData.rolls = rolls.map(r => this.fromData(r.toJSON()));

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

  /* -------------------------------------------- */

  /**
   * Perform specific changes to message data before creating message.
   * @param {BasicRoll[]} rolls   Rolls to add to the message.
   * @param {object} messageData  The data object to use when creating the message.
   * @protected
   */
  static _prepareMessageData(rolls, messageData) {}

  /* -------------------------------------------- */
  /*  Evaluate Methods                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async evaluate(options={}) {
    this.preCalculateDiceTerms(options);
    return super.evaluate(options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  evaluateSync(options={}) {
    this.preCalculateDiceTerms(options);
    return super.evaluateSync(options);
  }

  /* -------------------------------------------- */
  /*  Roll Formula Parsing                        */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static replaceFormulaData(formula, data, options) {
    // This looks for the pattern `$!!$` and replaces it with just the value between the marks (the bang has
    // been added to ensure this is a deliberate shim from the system, not a unintentional usage that should
    // show an error).
    return super.replaceFormulaData(formula, data, options).replaceAll(/\$"?!(.+?)!"?\$/g, "$1");
  }

  /* -------------------------------------------- */
  /*  Maximize/Minimize Methods                   */
  /* -------------------------------------------- */

  /**
   * Replaces all dice terms that have modifiers with their maximum/minimum value.
   *
   * @param {object} [options={}]            Extra optional arguments which describe or modify the BasicRoll.
   */
  preCalculateDiceTerms(options={}) {
    if ( this._evaluated || (!options.maximize && !options.minimize) ) return;
    this.terms = this.terms.map(term => {
      if ( (term instanceof DiceTerm) && term.modifiers.length ) {
        const minimize = !options.maximize;
        const number = this.constructor.preCalculateTerm(term, { minimize });
        if ( Number.isFinite(number) ) return new NumericTerm({ number, options: term.options });
      }
      return term;
    });
  }

  /* -------------------------------------------- */

  /**
   * Gets information from passed die and calculates the maximum or minimum value that could be rolled.
   *
   * @param {DiceTerm} die                            DiceTerm to get the maximum/minimum value.
   * @param {object} [preCalculateOptions={}]         Additional options to modify preCalculate functionality.
   * @param {boolean} [preCalculateOptions.minimize=false]  Calculate the minimum value instead of the maximum.
   * @returns {number|null}                                 Maximum/Minimum value that could be rolled as an integer, or
   *                                                        null if the modifiers could not be precalculated.
   */
  static preCalculateTerm(die, { minimize=false }={}) {
    let face = minimize ? 1 : die.faces;
    let number = die.number;
    const currentModifiers = foundry.utils.deepClone(die.modifiers);
    const keep = new Set(["k", "kh", "kl"]);
    const drop = new Set(["d", "dh", "dl"]);
    const validModifiers = new Set([...keep, ...drop, "max", "min"]);
    let matchedModifier = false;

    for ( const modifier of currentModifiers ) {
      const rgx = /(m[ai][xn]|[kd][hl]?)(\d+)?/i;
      const match = modifier.match(rgx);
      if ( !match ) continue;
      if ( match[0].length < match.input.length ) currentModifiers.push(match.input.slice(match[0].length));
      let [, command, value] = match;
      command = command.toLowerCase();
      if ( !validModifiers.has(command) ) continue;

      matchedModifier = true;
      const amount = parseInt(value) || (command === "max" || command === "min" ? -1 : 1);
      if ( amount > 0 ) {
        if ( (command === "max" && minimize) || (command === "min" && !minimize) ) continue;
        else if ( (command === "max" || command === "min") ) face = Math.min(die.faces, amount);
        else if ( keep.has(command) ) number = Math.min(number, amount);
        else if ( drop.has(command) ) number = Math.max(1, number - amount);
      }
    }

    return matchedModifier ? face * number : null;
  }

  /* -------------------------------------------- */
  /*  Simplification Methods                      */
  /* -------------------------------------------- */

  /**
   * Replace number and faces of dice terms with numeric values where possible.
   */
  simplify() {
    for ( const die of this.dice ) {
      const n = die._number;
      if ( (n instanceof BasicRoll) && n.isDeterministic ) die._number = n.evaluateSync().total;
      const f = die._faces;
      if ( (f instanceof BasicRoll) && f.isDeterministic ) die._faces = f.evaluateSync().total;

      // Preserve flavor.
      if ( f.terms?.[0]?.flavor ) die.options.flavor = f.terms[0].flavor;
    }

    this.resetFormula();
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Merge two roll configurations in place.
   * @param {Partial<BasicRollConfiguration>} original  The initial configuration that will be merged into.
   * @param {Partial<BasicRollConfiguration>} other     The configuration to merge.
   * @returns {Partial<BasicRollConfiguration>}         The original instance.
   */
  static mergeConfigs(original, other={}) {
    if ( other.data ) {
      original.data ??= {};
      Object.assign(original.data, other.data);
    }

    if ( other.parts?.length ) {
      original.parts ??= [];
      original.parts.unshift(...other.parts);
    }

    if ( other.options ) {
      original.options = this.mergeOptions(original.options, other.options);
    }

    return original;
  }

  /* -------------------------------------------- */

  /**
   * Merge two roll options objects.
   * @param {Partial<BasicRollOptions>} [original]  The initial options that will be merged into.
   * @param {Partial<BasicRollOptions>} [other]     The options to merge.
   * @returns {Partial<BasicRollOptions>}           The merged version.
   */
  static mergeOptions(original={}, other={}) {
    return foundry.utils.mergeObject(original, other, { inplace: false });
  }
}
