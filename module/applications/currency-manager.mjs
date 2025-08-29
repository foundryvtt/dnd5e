import { filteredKeys } from "../utils.mjs";
import Award from "./award.mjs";
import Application5e from "./api/application.mjs";

/**
 * Application for performing currency conversions & transfers.
 */
export default class CurrencyManager extends Application5e {

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      setAll: CurrencyManager.#setTransferValue,
      setHalf: CurrencyManager.#setTransferValue
    },
    classes: ["currency-manager", "standard-form"],
    document: null,
    form: {
      closeOnSubmit: true,
      handler: CurrencyManager.#handleFormSubmission
    },
    position: {
      width: 350
    },
    tag: "form",
    window: {
      title: "DND5E.CurrencyManager.Title"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    convert: {
      template: "systems/dnd5e/templates/apps/currency-manager-convert.hbs"
    },
    transfer: {
      template: "systems/dnd5e/templates/apps/currency-manager-transfer.hbs"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "transfer"
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Document for which the currency is being managed.
   * @type {Actor5e|Item5e}
   */
  get document() {
    return this.options.document;
  }

  /* -------------------------------------------- */

  /**
   * Destinations to which currency can be transferred.
   * @type {(Actor5e|Item5e)[]}
   */
  get transferDestinations() {
    const destinations = [];
    const actor = this.document instanceof Actor ? this.document : this.document.parent;
    if ( actor && (actor !== this.document) ) destinations.push(actor);
    destinations.push(...(actor?.system.transferDestinations ?? []));
    destinations.push(...(actor?.itemTypes.container.filter(b => b !== this.document) ?? []));
    if ( game.user.isGM ) {
      const primaryParty = game.actors.party;
      if ( primaryParty && (this.document !== primaryParty) && !destinations.includes(primaryParty) ) {
        destinations.push(primaryParty);
      }
    }
    return destinations;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.currency = this.document.system.currency;
    context.destinations = Award.prepareDestinations(this.transferDestinations);
    context.tabs = this._getTabs();

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    context.tab = context.tabs[partId];
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the tab information for the sheet.
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs() {
    return {
      convert: {
        id: "convert", group: "primary", icon: "fa-solid fa-arrow-up-short-wide",
        label: "DND5E.CurrencyManager.Convert.Label",
        active: this.tabGroups.primary === "convert",
        cssClass: this.tabGroups.primary === "convert" ? "active" : ""
      },
      transfer: {
        id: "transfer", group: "primary", icon: "fa-solid fa-reply-all fa-flip-horizontal",
        label: "DND5E.CurrencyManager.Transfer.Label",
        active: this.tabGroups.primary === "transfer",
        cssClass: this.tabGroups.primary === "transfer" ? "active" : ""
      }
    };
  }

  /* -------------------------------------------- */
  /*  Event Handling                              */
  /* -------------------------------------------- */

  /**
   * Handle setting the transfer amount based on the buttons.
   * @this {CurrencyManager}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   * @protected
   */
  static #setTransferValue(event, target) {
    for ( let [key, value] of Object.entries(this.document.system.currency) ) {
      if ( target.dataset.action === "setHalf" ) value = Math.floor(value / 2);
      const input = this.element.querySelector(`[name="amount.${key}"]`);
      if ( input && value ) input.value = value;
    }
    this._validateForm();
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    this._validateForm();
  }

  /* -------------------------------------------- */

  /**
   * Ensure the transfer form is in a valid form to be submitted.
   * @protected
   */
  _validateForm() {
    const formData = new foundry.applications.ux.FormDataExtended(this.element);
    const data = foundry.utils.expandObject(formData.object);
    let valid = true;
    if ( !filteredKeys(data.amount ?? {}).length ) valid = false;
    if ( !filteredKeys(data.destination ?? {}).length ) valid = false;
    this.element.querySelector('button[name="transfer"]').disabled = !valid;
  }

  /* -------------------------------------------- */

  /**
   * Handle submitting the currency manager form.
   * @this {Award}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
  static async #handleFormSubmission(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    switch ( event.submitter?.name ) {
      case "convert":
        await this.constructor.convertCurrency(this.document);
        break;
      case "transfer":
        const destinations = this.transferDestinations.filter(d => data.destination[d.id]);
        await this.constructor.transferCurrency(this.document, destinations, data.amount);
        break;
    }
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

    const currencies = Object.entries(CONFIG.DND5E.currencies)
      .filter(([, c]) => c.conversion)
      .sort((a, b) => a[1].conversion - b[1].conversion);

    // Convert all currently to smallest denomination
    const smallestConversion = currencies.at(-1)[1].conversion;
    let amount = currencies.reduce((amount, [denomination, config]) =>
      amount + (currency[denomination] * (smallestConversion / config.conversion))
    , 0);

    // Convert base units into the highest denomination possible
    for ( const [denomination, config] of currencies) {
      const ratio = smallestConversion / config.conversion;
      currency[denomination] = Math.floor(amount / ratio);
      amount -= currency[denomination] * ratio;
    }

    // Save the updated currency object
    return doc.update({ "system.currency": currency });
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
