import { filteredKeys } from "../utils.mjs";

/**
 * Application for awarding XP and currency to players.
 */
export default class Award extends FormApplication {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "award"],
      template: "systems/dnd5e/templates/apps/award.hbs",
      title: "DND5E.Award.Title",
      width: 350,
      height: "auto"
    });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Destinations to which XP & currency can be awarded.
   * @type {Actor5e[]}
   */
  get transferDestinations() {
    if ( this.object?.system.type?.value === "party" ) return this.object.system.transferDestinations ?? [];
    if ( !game.user.isGM ) return [];
    const primaryParty = game.settings.get("dnd5e", "primaryParty")?.actor;
    return primaryParty ? [primaryParty, ...primaryParty.system.transferDestinations] : [];
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options={}) {
    const context = super.getData(options);

    context.CONFIG = CONFIG.DND5E;
    context.currency = this.object?.system.currency;
    context.destinations = Award.prepareDestinations(this.transferDestinations);
    context.xp = this.object?.system.details.xp.value ?? this.object?.system.details.xp.derived;

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Apply type icons to transfer destinations and prepare them for display in the list.
   * @param {Document[]} destinations
   * @returns {{doc: Document, icon: string}[]}
   */
  static prepareDestinations(destinations) {
    const icons = {
      container: '<dnd5e-icon class="fa-fw" src="systems/dnd5e/icons/svg/backpack.svg"></dnd5e-icon>',
      group: '<i class="fa-solid fa-people-group"></i>',
      vehicle: '<i class="fa-solid fa-sailboat"></i>'
    };
    return destinations.map(doc => ({
      doc, icon: icons[doc.type] ?? '<i class="fa-solid fa-fw fa-user"></i>'
    }));
  }

  /* -------------------------------------------- */
  /*  Event Handling                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeInput(event) {
    super._onChangeInput(event);
    this._validateForm();
  }

  /* -------------------------------------------- */

  /**
   * Ensure the award form is in a valid form to be submitted.
   * @protected
   */
  _validateForm() {
    const data = foundry.utils.expandObject(this._getSubmitData());
    let valid = true;
    if ( !filteredKeys(data.amount ?? {}).length && !data.xp ) valid = false;
    if ( !filteredKeys(data.destination ?? {}).length ) valid = false;
    this.form.querySelector('button[name="transfer"]').disabled = !valid;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const data = foundry.utils.expandObject(formData);
    const destinations = this.transferDestinations.filter(d => data.destination[d.id]);
    await this.constructor.awardCurrency(data.amount, destinations, this.object);
    await this.constructor.awardXP(data.xp, destinations, this.object);
    this.close();
  }

  /* -------------------------------------------- */
  /*  Awarding Methods                            */
  /* -------------------------------------------- */

  /**
   * Award currency, optionally transferring between one document and another.
   * @param {object[]} amounts                 Amount of each denomination to transfer.
   * @param {(Actor5e|Item5e)[]} destinations  Documents that should receive the currency.
   * @param {Actor5e|Item5e} [origin]          Document from which to move the currency, if not a freeform award.
   */
  static async awardCurrency(amounts, destinations, origin) {
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

  /* -------------------------------------------- */

  /**
   * Award XP split across the provided destination actors.
   * @param {number} amount           Amount of XP to award.
   * @param {Actor5e[]} destinations  Actors that should receive the XP.
   * @param {Actor5e} [origin]        Group actor from which to transfer the XP.
   */
  static async awardXP(amount, destinations, origin) {
    destinations = destinations.filter(d => ["character", "group"].includes(d.type));
    if ( !amount || !destinations.length ) return;

    let originUpdate = origin?.system.details.xp.value ?? Infinity;
    const perDestination = Math.floor(Math.min(amount, originUpdate) / destinations.length);
    originUpdate -= amount;
    for ( const destination of destinations ) {
      await destination.update({"system.details.xp.value": destination.system.details.xp.value + perDestination});
    }

    if ( Number.isFinite(originUpdate) ) await origin.update({"system.details.xp.value": originUpdate});
  }
}
