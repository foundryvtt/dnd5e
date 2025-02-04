import { filteredKeys } from "../utils.mjs";
import Award from "./award.mjs";
import DialogMixin from "./dialog-mixin.mjs";

/**
 * Application for performing currency conversions & transfers.
 */
export default class CurrencyManager extends DialogMixin(FormApplication) {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "currency-manager", "dialog"],
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
    if ( actor && (actor !== this.object) ) destinations.push(actor);
    destinations.push(...(actor?.system.transferDestinations ?? []));
    destinations.push(...(actor?.itemTypes.container.filter(b => b !== this.object) ?? []));
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

  /** @inheritDoc */
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

  /** @inheritDoc */
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

  /** @inheritDoc */
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
   * Deduct a certain amount of currency from a given Actor.
   * @param {Actor5e} actor                          The actor.
   * @param {number} amount                          The amount of currency.
   * @param {string} denomination                    The currency's denomination.
   * @param {object} [options]
   * @param {boolean} [options.recursive=false]      Deduct currency from containers as well as the base Actor. TODO
   * @param {"high"|"low"} [options.priority="low"]  Prioritize higher denominations before lower, or vice-versa.
   * @param {boolean} [options.exact=true]           Prioritize deducting the requested denomination first.
   * @throws {Error} If the Actor does not have sufficient currency.
   * @returns {Promise<Actor5e>|void}
   */
  static deductActorCurrency(actor, amount, denomination, options={}) {
    if ( amount <= 0 ) return;
    // eslint-disable-next-line no-unused-vars
    const { item, remainder, ...updates } = this.getActorCurrencyUpdates(actor, amount, denomination, options);
    if ( remainder ) throw new Error(game.i18n.format("DND5E.CurrencyManager.Error.InsufficientFunds", {
      denomination,
      amount: new Intl.NumberFormat(game.i18n.lang).format(amount),
      name: actor.name
    }));
    return actor.update(updates);
  }

  /* -------------------------------------------- */

  /**
   * Determine model updates for deducting a certain amount of currency from a given Actor.
   * @param {Actor5e} actor                          The actor.
   * @param {number} amount                          The amount of currency.
   * @param {string} denomination                    The currency's denomination.
   * @param {object} [options]
   * @param {boolean} [options.recursive=false]      Deduct currency from containers as well as the base Actor. TODO
   * @param {"high"|"low"} [options.priority="low"]  Prioritize higher denominations before lower, or vice-versa.
   * @param {boolean} [options.exact=true]           Prioritize deducting the requested denomination first.
   * @returns {{ item: object[], remainder: number, [p: string]: any }}
   */
  static getActorCurrencyUpdates(actor, amount, denomination, { recursive=false, priority="low", exact=true }={}) {
    const { currency } = actor.system;
    const updates = { system: { currency: { ...currency } }, remainder: amount, item: [] };
    if ( amount <= 0 ) return updates;

    const currencies = Object.entries(CONFIG.DND5E.currencies).map(([denom, { conversion }]) => {
      return [denom, conversion];
    }).sort(([, a], [, b]) => priority === "high" ? a - b : b - a);
    const baseConversion = CONFIG.DND5E.currencies[denomination].conversion;

    if ( exact ) currencies.unshift([denomination, baseConversion]);
    for ( const [denom, conversion] of currencies ) {
      const multiplier = conversion / baseConversion;
      const deduct = Math.min(updates.system.currency[denom], Math.floor(updates.remainder * multiplier));
      updates.remainder -= deduct / multiplier;
      updates.system.currency[denom] -= deduct;
      if ( !updates.remainder ) return updates;
    }

    return updates;
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
