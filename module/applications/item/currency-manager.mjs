/**
 * Application for performing currency conversions & transfers.
 */
export default class CurrencyManager extends FormApplication {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "currency-manager"],
      tabs: [{navSelector: "nav", contentSelector: ".sheet-content", initial: "transfer"}],
      template: "systems/dnd5e/templates/apps/currency-manager.hbs",
      title: "DND5E.CurrencyManage",
      width: 350,
      height: "auto"
    });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Other containers to which currency can be transferred.
   * @type {Document[]}
   */
  get transferDestinations() {
    const destinations = [];
    const actor = this.object instanceof Actor ? this.object : this.object.parent;
    if ( actor !== this.object ) destinations.push(actor);
    destinations.push(...actor.itemTypes.container.filter(b => b !== this.object));
    return destinations;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options={}) {
    const context = super.getData(options);

    context.CONFIG = CONFIG.DND5E;
    context.currency = this.object.system.currency;
    context.destinations = this.transferDestinations;

    return context;
  }

  /* -------------------------------------------- */
  /*  Event Handling                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(jQuery) {
    super.activateListeners(jQuery);
    const html = jQuery[0];

    for ( const button of html.querySelectorAll('[name^="set"]') ) {
      button.addEventListener("click", this._onSetTransferValue.bind(this));
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle setting the transfer amount based on the buttons.
   * @param {PointerEvent} event  Triggering click event.
   */
  _onSetTransferValue(event) {
    for ( let [key, value] of Object.entries(this.object.system.currency) ) {
      if ( event.target.name === "setHalf" ) value = Math.floor(value / 2);
      const input = this.form.querySelector(`[name="amount.${key}"]`);
      if ( input && value ) input.value = value;
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const data = foundry.utils.expandObject(formData);
    switch ( event.submitter?.name ) {
      case "convert":
        await this.constructor.convertCurrency(this.object);
        break;
      case "transfer":
        const destination = this.transferDestinations.find(d => d.id === data.destination);
        await this.constructor.transferCurrency(this.object, destination, data.amount);
        break;
    }
    this.close();
  }

  /* -------------------------------------------- */
  /*  Currency Operations                         */
  /* -------------------------------------------- */

  /**
   * Convert all carried currency to the highest possible denomination using configured conversion rates.
   * See CONFIG.DND5E.currencies for configuration.
   * @param {Actor5e|Item5e} doc  Actor or container item to convert.
   * @returns {Promise<Actor5e|Item5e>}
   */
  static convertCurrency(doc) {
    const currency = foundry.utils.deepClone(doc.system.currency);

    const currencies = Object.entries(CONFIG.DND5E.currencies);
    currencies.sort((a, b) => a[1].conversion - b[1].conversion);

    // Count total converted units of the base currency
    let basis = currencies.reduce((change, [denomination, config]) => {
      if ( !config.conversion ) return change;
      return change + (currency[denomination] / config.conversion);
    }, 0);

    // Convert base units into the highest denomination possible
    for ( const [denomination, config] of currencies) {
      if ( !config.conversion ) continue;
      const amount = Math.floor(basis * config.conversion);
      currency[denomination] = amount;
      basis -= (amount / config.conversion);
    }

    // Save the updated currency object
    return doc.update({"system.currency": currency});
  }

  /* -------------------------------------------- */

  /**
   * Transfer currency between one document and another.
   * @param {Actor5e|Item5e} origin       Document from which to move the currency.
   * @param {Actor5e|Item5e} destination  Document that should receive the currency.
   * @param {object[]} amounts            Amount of each denomination to transfer.
   * @returns {Promise}
   */
  static async transferCurrency(origin, destination, amounts) {
    if ( !destination ) return;

    const originUpdates = {};
    const destinationUpdates = {};
    for ( let [key, amount] of Object.entries(amounts) ) {
      if ( !amount ) continue;
      amount = Math.clamped(amount, -destination.system.currency[key], origin.system.currency[key]);
      originUpdates[`system.currency.${key}`] = origin.system.currency[key] - amount;
      destinationUpdates[`system.currency.${key}`] = destination.system.currency[key] + amount;
    }

    await origin.update(originUpdates);
    return destination.update(destinationUpdates);
  }
}
