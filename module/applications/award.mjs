import { filteredKeys, formatNumber } from "../utils.mjs";
import Application5e from "./api/application.mjs";

/**
 * @typedef AwardOptions
 * @property {Record<string, number>|null} currency  Amount of each currency to award.
 * @property {boolean} each                          Distribute full award to each destination, rather than dividing it
 *                                                   among the destinations.
 * @property {Set<string>} savedDestinations         Set of IDs for previously selected destinations.
 * @property {number|null} xp                        Amount of experience points to award.
 */

/**
 * Application for awarding XP and currency to players.
 */
export default class Award extends Application5e {

  /** @override */
  static DEFAULT_OPTIONS = {
    award: {
      currency: null,
      each: false,
      savedDestinations: new Set(),
      xp: null
    },
    classes: ["award", "standard-form"],
    form: {
      handler: Award.#handleFormSubmission
    },
    origin: null,
    position: {
      width: 350
    },
    tag: "form",
    window: {
      title: "DND5E.Award.Title"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    award: {
      template: "systems/dnd5e/templates/apps/award.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Award options.
   * @type {AwardOptions}
   */
  get award() {
    return this.options.award;
  }

  /* -------------------------------------------- */

  /**
   * Group actor from which this award is being granted.
   * @type {Actor5e}
   */
  get origin() {
    return this.options.origin;
  }

  /* -------------------------------------------- */

  /**
   * Destinations to which XP & currency can be awarded.
   * @type {Actor5e[]}
   */
  get transferDestinations() {
    if ( this.isPartyAward ) return this.origin.system.transferDestinations ?? [];
    if ( !game.user.isGM ) return [];
    const primaryParty = game.actors.party;
    return primaryParty
      ? [primaryParty, ...primaryParty.system.transferDestinations]
      : game.users.map(u => u.character).filter(c => c);
  }

  /* -------------------------------------------- */

  /**
   * Is this award coming from a party group actor rather than the /award command?
   * @type {boolean}
   */
  get isPartyAward() {
    return this.origin?.type === "group";
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.currency = Object.entries(CONFIG.DND5E.currencies).reduce((obj, [k, { label, icon }]) => {
      obj[k] = {
        label, icon,
        value: this.award.currency ? this.award.currency[k] : this.origin?.system.currency[k]
      };
      return obj;
    }, {});
    context.destinations = Award.prepareDestinations(this.transferDestinations, this.award.savedDestinations);
    context.each = this.award.each ?? false;
    context.hideXP = game.settings.get("dnd5e", "levelingMode") === "noxp";
    context.noPrimaryParty = !game.actors.party && !this.isPartyAward;
    context.xp = this.award.xp ?? this.origin?.system.details?.xp?.value;

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Apply type icons to transfer destinations and prepare them for display in the list.
   * @param {Document[]} destinations          Destination documents to prepare.
   * @param {Set<string>} [savedDestinations]  IDs of targets to pre-check.
   * @returns {{doc: Document, icon: string}[]}
   */
  static prepareDestinations(destinations, savedDestinations) {
    const icons = {
      container: '<dnd5e-icon class="fa-fw" src="systems/dnd5e/icons/svg/backpack.svg"></dnd5e-icon>',
      group: '<i class="fa-solid fa-people-group"></i>',
      vehicle: '<i class="fa-solid fa-sailboat"></i>'
    };
    return destinations.map(doc => ({
      doc, checked: savedDestinations?.has(doc.id), icon: icons[doc.type] ?? '<i class="fa-solid fa-fw fa-user"></i>'
    }));
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
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
   * Ensure the award form is in a valid form to be submitted.
   * @protected
   */
  _validateForm() {
    const formData = new foundry.applications.ux.FormDataExtended(this.element);
    const data = foundry.utils.expandObject(formData.object);
    let valid = true;
    if ( !filteredKeys(data.amount ?? {}).length && !data.xp ) valid = false;
    if ( !filteredKeys(data.destination ?? {}).length ) valid = false;
    this.element.querySelector('button[name="transfer"]').disabled = !valid;
  }

  /* -------------------------------------------- */

  /**
   * Handle submitting the award form.
   * @this {Award}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
  static async #handleFormSubmission(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    const destinations = this.transferDestinations.filter(d => data.destination[d.id]);
    const each = data.each;
    this._saveDestinations(destinations);
    const results = new Map();
    await this.constructor.awardCurrency(data.amount, destinations, { each, origin: this.origin, results });
    await this.constructor.awardXP(data.xp, destinations, { each, origin: this.origin, results });
    this.constructor.displayAwardMessages(results);
    this.close();
  }

  /* -------------------------------------------- */

  /**
   * Save the selected destination IDs to either the current group's flags or the user's flags.
   * @param {Actor5e[]} destinations  Selected destinations to save.
   * @protected
   */
  _saveDestinations(destinations) {
    const target = this.isPartyAward ? this.origin : game.user;
    target.setFlag("dnd5e", "awardDestinations", destinations);
  }

  /* -------------------------------------------- */
  /*  Awarding Methods                            */
  /* -------------------------------------------- */

  /**
   * Award currency, optionally transferring between one document and another.
   * @param {Record<string, number>} amounts   Amount of each denomination to transfer.
   * @param {(Actor5e|Item5e)[]} destinations  Documents that should receive the currency.
   * @param {object} [config={}]
   * @param {boolean} [config.each=false]      Award the specified amount to each player, rather than splitting it.
   * @param {Actor5e|Item5e} [config.origin]   Document from which to move the currency, if not a freeform award.
   * @param {Map<Actor5e|Item5e, object>} [config.results]  Results of the award operation.
   */
  static async awardCurrency(amounts, destinations, { each=false, origin, results=new Map() }={}) {
    if ( !destinations.length ) return;
    const originCurrency = origin ? foundry.utils.deepClone(origin.system.currency) : null;

    for ( const k of Object.keys(amounts) ) {
      if ( each ) amounts[k] = amounts[k] * destinations.length;
      if ( origin ) amounts[k] = Math.min(amounts[k], originCurrency[k] ?? 0);
    }

    let remainingDestinations = destinations.length;
    for ( const destination of destinations ) {
      const destinationUpdates = {};
      if ( !results.has(destination) ) results.set(destination, {});
      const result = results.get(destination).currency ??= {};

      for ( let [key, amount] of Object.entries(amounts) ) {
        if ( !amount ) continue;
        amount = Math.clamp(
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
        result[key] = amount;
      }

      await destination.update(destinationUpdates);
      remainingDestinations -= 1;
    }

    if ( origin ) await origin.update({ "system.currency": originCurrency });
  }

  /* -------------------------------------------- */

  /**
   * Award XP split across the provided destination actors.
   * @param {number} amount            Amount of XP to award.
   * @param {Actor5e[]} destinations   Actors that should receive the XP.
   * @param {object} [config={}]
   * @param {boolean} [config.each=false]      Award the specified amount to each player, rather than splitting it.
   * @param {Actor5e} [config.origin]  Group actor from which to transfer the XP.
   * @param {Map<Actor5e|Item5e, object>} [config.results]  Results of the award operation.
   */
  static async awardXP(amount, destinations, { each=false, origin, results=new Map() }={}) {
    destinations = destinations.filter(d => ["character", "group"].includes(d.type));
    if ( !amount || !destinations.length ) return;

    const xp = origin?.system.details?.xp;
    let originUpdate = origin ? (xp?.value ?? 0) : Infinity;
    if ( each ) amount = amount * destinations.length;
    const perDestination = Math.floor(Math.min(amount, originUpdate) / destinations.length);
    originUpdate -= amount;
    for ( const destination of destinations ) {
      await destination.update({ "system.details.xp.value": destination.system.details.xp.value + perDestination });
      if ( !results.has(destination) ) results.set(destination, {});
      const result = results.get(destination);
      result.xp = perDestination;
    }

    if ( Number.isFinite(originUpdate) ) await origin.update({ "system.details.xp.value": originUpdate });
  }

  /* -------------------------------------------- */

  /**
   * Display chat messages for awarded currency and XP.
   * @param {Map<Actor5e|Item5e, object>} results  Results of any award operations.
   */
  static async displayAwardMessages(results) {
    const cls = getDocumentClass("ChatMessage");
    const messages = [];
    for ( const [destination, result] of results ) {
      const entries = [];
      for ( const [key, amount] of Object.entries(result.currency ?? {}) ) {
        const label = CONFIG.DND5E.currencies[key].label;
        entries.push(`
          <span class="award-entry">
            ${formatNumber(amount)} <i class="currency ${key}" data-tooltip aria-label="${label}"></i>
          </span>
        `);
      }
      if ( result.xp ) entries.push(`
        <span class="award-entry">
          ${formatNumber(result.xp)} ${game.i18n.localize("DND5E.ExperiencePoints.Abbreviation")}
        </span>
      `);
      if ( !entries.length ) continue;

      const content = game.i18n.format("DND5E.Award.Message", {
        name: destination.name, award: `<span class="dnd5e2">${game.i18n.getListFormatter().format(entries)}</span>`
      });

      const whisperTargets = game.users.filter(user => destination.testUserPermission(user, "OWNER"));
      const whisper = whisperTargets.length !== game.users.size;
      const messageData = {
        content,
        whisper: whisper ? whisperTargets : []
      };
      messages.push(messageData);
    }
    if ( messages.length ) cls.createDocuments(messages);
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
      const { currency, xp, party, each } = this.parseAwardCommand(message);

      for ( const [key, formula] of Object.entries(currency) ) {
        const roll = new Roll(formula);
        await roll.evaluate();
        currency[key] = roll.total;
      }

      // If the party command is set, a primary party is set, and the award isn't empty, skip the UI
      const primaryParty = game.actors.party;
      if ( party && primaryParty && (xp || filteredKeys(currency).length) ) {
        const destinations = each ? primaryParty.system.playerCharacters : [primaryParty];
        const results = new Map();
        await this.awardCurrency(currency, destinations, { each, results });
        await this.awardXP(xp, destinations, { each, results });
        this.displayAwardMessages(results);
      }

      // Otherwise show the UI with defaults
      else {
        const savedDestinations = game.user.getFlag("dnd5e", "awardDestinations");
        const app = new Award({ award: { currency, xp, each, savedDestinations } });
        app.render({ force: true });
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
    let each = false;
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
        else if ( label === "xp" ) xp = Number(amount);
        else if ( part === "each" ) each = true;
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

    return { currency, xp, each, party };
  }
}
