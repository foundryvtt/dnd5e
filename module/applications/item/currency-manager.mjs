import { filteredKeys } from "../../utils.mjs";

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
      title: "DND5E.CurrencyManager.Title",
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
    destinations.push(...(actor.system.transferDestinations ?? []));
    destinations.push(...actor.itemTypes.container.filter(b => b !== this.object));
    if ( game.user.isGM ) {
      const primaryParty = game.settings.get("dnd5e", "primaryParty")?.actor;
      if ( primaryParty && (this.object !== primaryParty) && !destinations.includes(primaryParty) ) {
        destinations.push(primaryParty);
      }
    }
    return destinations;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options={}) {
    const context = super.getData(options);

    const icons = {
      container: '<dnd5e-icon class="fa-fw" src="systems/dnd5e/icons/svg/backpack.svg"></dnd5e-icon>',
      group: '<i class="fa-solid fa-people-group"></i>',
      vehicle: '<i class="fa-solid fa-sailboat"></i>'
    };

    context.CONFIG = CONFIG.DND5E;
    context.currency = this.object.system.currency;
    context.destinations = this.transferDestinations.map(doc => ({
      doc, icon: icons[doc.type] ?? '<i class="fa-solid fa-fw fa-user"></i>'
    }));

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

  /** @inheritDoc */
  _onChangeInput(event) {
    super._onChangeInput(event);
    this._validateForm();
  }

  /* -------------------------------------------- */

  /**
   * Handle setting the transfer amount based on the buttons.
   * @param {PointerEvent} event  Triggering click event.
   * @protected
   */
  _onSetTransferValue(event) {
    for ( let [key, value] of Object.entries(this.object.system.currency) ) {
      if ( event.target.name === "setHalf" ) value = Math.floor(value / 2);
      const input = this.form.querySelector(`[name="amount.${key}"]`);
      if ( input && value ) input.value = value;
    }
    this._validateForm();
  }

  /* -------------------------------------------- */

  /**
   * Ensure the transfer form is in a valid form to be submitted.
   * @protected
   */
  _validateForm() {
    const data = foundry.utils.expandObject(this._getSubmitData());
    let valid = true;
    if ( !Object.values(data.amount ?? {}).some(v => v) ) valid = false;
    if ( !filteredKeys(data.destination ?? {}).length ) valid = false;
    this.form.querySelector('button[name="transfer"]').disabled = !valid;
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
        const destinations = this.transferDestinations.filter(d => data.destination[d.id]);
        await this.constructor.transferCurrency(data.amount, destinations, this.object);
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
   * @param {object[]} amounts            Amount of each denomination to transfer.
   * @param {Document[]} destinations     Documents that should receive the currency.
   * @param {Actor5e|Item5e} [origin]     Document from which to move the currency, if not a freeform reward.
   * @returns {Promise}
   */
  static async transferCurrency(amounts, destinations, origin) {
    if ( !destinations.length ) return;
    const originCurrency = origin ? foundry.utils.deepClone(origin.system.currency) : null;

    let remainingDestinations = destinations.length;
    for ( const destination of destinations ) {
      const destinationUpdates = {};

      for ( let [key, amount] of Object.entries(amounts) ) {
        if ( !amount ) continue;
        amount = Math.clamped(
          // Divide amount between remaining destinations
          Math.floor(amount / remainingDestinations),
          // Ensure negative amounts aren't more than is contained in destination
          -destination.system.currency[key],
          // Ensure positive amounts aren't more than is contained in origin
          originCurrency ? originCurrency[key] : Infinity
        );
        amounts[key] -= amount;
        if ( originCurrency ) originCurrency[key] -= amount;
        destinationUpdates[`system.currency.${key}`] = destination.system.currency[key] + amount;
      }

      await destination.update(destinationUpdates);
      remainingDestinations -= 1;
    }

    if ( origin ) await origin.update({"system.currency": originCurrency});
  }
}
