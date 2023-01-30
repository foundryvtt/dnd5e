/**
 * A class responsible for displaying roll configuration options to the user.
 * @extends {FormApplication}
 */
export default class D20RollConfig extends FormApplication {
  /**
   * @param {D20RollBuilder} buildRoll              A function that constructs the appropriate D20Roll.
   * @param {D20RollConfiguration} [rollConfig={}]  Options forwarded to the D20Roll constructor.
   * @param {D20DialogConfiguration} [options={}]   Options to configure the behavior of this dialog.
   */
  constructor(buildRoll, rollConfig={}, options={}) {
    const roll = buildRoll(rollConfig);
    super(roll, options);

    /**
     * A function that constructs the appropriate D20Roll.
     * @type {D20RollBuilder}
     */
    Object.defineProperty(this, "buildRoll", {value: buildRoll, writable: false, enumerable: true});

    /**
     * Options forwarded to the D20Roll constructor.
     * @type {D20RollConfiguration}
     */
    Object.defineProperty(this, "rollConfig", {value: rollConfig, writable: false, enumerable: true});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 400,
      submitOnChange: false,
      closeOnSubmit: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get template() {
    return this.options.template ?? "systems/dnd5e/templates/chat/roll-dialog.hbs";
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options={}) {
    return foundry.utils.mergeObject(super.getData(), {
      formula: this._getFormulaForDisplay(),
      rollModes: CONFIG.Dice.rollModes,
      abilities: CONFIG.DND5E.abilities,
      chooseModifier: this.options.chooseModifier,
      defaultRollMode: this.object.options.rollMode ?? this.options.defaultRollMode,
      defaultAbility: this.object.data.ability ?? this.options.defaultAbility,
      bonus: this.object.data.bonus
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".action-button").on("click", this._onAction.bind(this));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _getSubmitData(updateData={}) {
    const formData = super._getSubmitData(updateData);
    const parts = [];
    const data = {};

    if ( formData.bonus ) {
      parts.push("@bonus");
      data.bonus = formData.bonus;
    }

    return {
      parts, data,
      ability: formData.ability,
      rollMode: formData.rollMode
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    if ( event.currentTarget.name === "ability" ) {
      // Recalculate the roll if the ability used changes.
      this.object = this.#buildRoll();
      this.form.elements.formula.value = this._getFormulaForDisplay();
    }
    return super._onChangeInput(event);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async close(options={}) {
    this.options.resolve?.(null);
    return super.close(options);
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking one of the action buttons to submit the sheet.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onAction(event) {
    const action = event.currentTarget.dataset.action;
    const modes = CONFIG.Dice.D20Roll.ADV_MODE;
    let advantageMode = modes.NORMAL;
    switch ( action ) {
      case "advantage": advantageMode = modes.ADVANTAGE; break;
      case "disadvantage": advantageMode = modes.DISADVANTAGE; break;
    }
    const roll = this.#buildRoll(advantageMode);
    this.options.resolve?.(roll);
    return this.close({submit: false, force: true});
  }

  /* -------------------------------------------- */

  /**
   * Format the roll's formula for display.
   * @returns {string}
   * @protected
   */
  _getFormulaForDisplay() {
    let formula = this.object.formula;
    if ( !this.object.data.bonus ) formula += " + @bonus";
    return formula;
  }

  /* -------------------------------------------- */

  /**
   * Prepare a D20Roll based on the configured roll information, plus the fields present in the dialog.
   * @param {number} [advantageMode]  An optional advantage mode to build the roll with.
   * @returns {D20Roll}
   */
  #buildRoll(advantageMode) {
    let {parts=[], data={}, ...config} = this._getSubmitData();
    parts = (this.rollConfig.parts || []).concat(parts);
    data = foundry.utils.mergeObject(this.rollConfig.data || {}, data, {inplace: false});
    const rollConfig = {...this.rollConfig, ...config, parts, data};
    if ( advantageMode !== undefined ) rollConfig.advantageMode = advantageMode;
    return this.buildRoll(rollConfig);
  }
}
