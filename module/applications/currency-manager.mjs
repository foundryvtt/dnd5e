import { filteredKeys } from "../utils.mjs";
import Award from "./award.mjs";

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
   * Destinations to which currency can be transferred.
   * @type {(Actor5e|Item5e)[]}
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

    context.CONFIG = CONFIG.DND5E;
    context.currency = this.object.system.currency;
    context.destinations = Award.prepareDestinations(this.transferDestinations);

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
    if ( !filteredKeys(data.amount ?? {}).length ) valid = false;
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
        await this.constructor.transferCurrency(this.object, destinations, data.amount);
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
   * @param {Document[]} destinations     Documents that should receive the currency.
   * @param {object[]} amounts            Amount of each denomination to transfer.
   */
  static async transferCurrency(origin, destinations, amounts) {
    Award.awardCurrency(amounts, destinations, { origin });
  }
}
