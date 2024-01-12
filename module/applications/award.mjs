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
      height: "auto",
      currency: null,
      xp: null
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
    context.currency = Object.entries(CONFIG.DND5E.currencies).reduce((obj, [k, { label }]) => {
      obj[k] = { label, value: this.options.currency ? this.options.currency[k] : this.object?.system.currency[k] };
      return obj;
    }, {});
    context.destinations = Award.prepareDestinations(this.transferDestinations);
    context.hideXP = game.settings.get("dnd5e", "disableExperienceTracking");
    context.xp = this.options.xp ?? this.object?.system.details.xp.value ?? this.object?.system.details.xp.derived;

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

  /* -------------------------------------------- */
  /*  Chat Command                                */
  /* -------------------------------------------- */

  /**
   * Regular expression used to match the /award command in chat messages.
   * @type {RegExp}
   */
  static COMMAND_PATTERN = new RegExp(/^\/award(?:\s|$)/i);

  /* -------------------------------------------- */

  /**
   * Regular expression used to split currency & xp values from their labels.
   * @type {RegExp}
   */
  static VALUE_PATTERN = new RegExp(/^(.+?)(\D+)$/);

  /* -------------------------------------------- */

  /**
   * Use the `chatMessage` hook to determine if an award command was typed.
   * @param {string} message   Text of the message being posted.
   * @returns {boolean|void}   Returns `false` to prevent the message from continuing to parse.
   */
  static chatMessage(message) {
    if ( !this.COMMAND_PATTERN.test(message) ) return;
    this.handleAward(message);
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Parse the award command and grant an award.
   * @param {string} message  Award command typed in chat.
   */
  static async handleAward(message) {
    if ( !game.user.isGM ) {
      ui.notifications.error("DND5E.Award.NotGMError", { localize: true });
      return;
    }

    try {
      const { currency, xp, party } = this.parseAwardCommand(message);

      for ( const [key, formula] of Object.entries(currency) ) {
        const roll = new Roll(formula);
        await roll.evaluate();
        currency[key] = roll.total;
      }

      // If the party command is set, a primary party is set, and the award isn't empty, skip the UI
      const primaryParty = game.settings.get("dnd5e", "primaryParty")?.actor;
      if ( party && primaryParty && (xp || filteredKeys(currency).length) ) {
        await this.awardCurrency(currency, [primaryParty]);
        await this.awardXP(xp, [primaryParty]);
      }

      // Otherwise show the UI with defaults
      else {
        const app = new Award(null, { currency, xp });
        app.render(true);
      }
    } catch(err) {
      ui.notifications.warn(err.message);
    }
  }

  /* -------------------------------------------- */

  /**
   * Parse the award command.
   * @param {string} message  Award command typed in chat.
   * @returns {{currency: Record<string, number>, xp: number, party: boolean}}
   */
  static parseAwardCommand(message) {
    const command = message.replace(this.COMMAND_PATTERN, "").toLowerCase();

    const currency = {};
    let party = false;
    let xp;
    const unrecognized = [];
    for ( const part of command.split(" ") ) {
      if ( !part ) continue;
      let [, amount, label] = part.match(this.VALUE_PATTERN) ?? [];
      label = label?.toLowerCase();
      try {
        new Roll(amount);
        if ( label in CONFIG.DND5E.currencies ) currency[label] = amount;
        else if ( label === "xp" ) xp = amount;
        else if ( part === "party" ) party = true;
        else throw new Error();
      } catch(err) {
        unrecognized.push(part);
      }
    }

    // Display warning about an unrecognized commands
    if ( unrecognized.length ) throw new Error(game.i18n.format("DND5E.Award.UnrecognizedWarning", {
      commands: game.i18n.getListFormatter().format(unrecognized.map(u => `"${u}"`))
    }));

    return { currency, xp, party };
  }
}
