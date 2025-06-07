import Dialog5e from "../api/dialog.mjs";

/**
 * @type PartyRequestDialogOptions
 * @property {object}                     request
 * @property {PartyRequestCondition|null} request.condition  Callback used to determine if an actor should be included.
 * @property {Actor5e|null}               request.group      Group actor to fetch the actor list from, otherwise uses
 *                                                           the primary party if one is set or falls back to the
 *                                                           assigned characters.
 */

/**
 * @callback PartyRequestCondition
 * @param {Actor5e} actor  An actor that might be able to receive the request.
 * @returns {boolean}      Should the actor be shown in the dialog?
 */

/**
 * Dialog that allows GM to select party members to receive a roll request.
 */
export default class PartyRequestDialog extends Dialog5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["party-request"],
    form: {
      closeOnSubmit: true,
      handler: PartyRequestDialog.#handleFormSubmission
    },
    position: {
      width: 420
    },
    request: {
      condition: null,
      group: null
    },
    window: {
      title: "DND5E.CHATMESSAGE.REQUEST.Title"
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static emittedEvents = [...super.emittedEvents, "resolve"];

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/apps/party-request-dialog.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  #users;

  /**
   * Mapping of selected actors and their requested users.
   * @type {Map<Actor5e, User>}
   */
  get users() {
    return this.#users;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const group = this.options.request.group ?? game.settings.get("dnd5e", "primaryParty")?.actor;
    const allActors = group?.system.members.map(m => m.actor) ?? game.users.map(u => u.character).filter(_ => _);
    context.recipients = allActors
      .filter(actor => !this.options.request.condition || this.options.request.condition(actor))
      .map(actor => {
        const owners = game.users
          .filter(u => actor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
          .map(u => ({ value: u.id, label: u.name }));
        return {
          actor,
          checked: true, // TODO: Save checked state?
          defaultUser: null, // TODO: Save requested user?
          icon: '<i class="fa-solid fa-user fa-fw" inert></i>',
          users: [{ rule: true }, ...owners].filter(_ => _)
        };
      });
    return context;
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Handle submission of the dialog using the form buttons.
   * @this {PartyRequestDialog}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
  static async #handleFormSubmission(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    this.#users = Object.entries(data).reduce((map, [id, { request, user }]) => {
      if ( request ) map.set(game.actors.get(id), game.users.get(user));
      return map;
    }, new Map());
    this.dispatchEvent(new CustomEvent("resolve", { bubbles: true, detail: this.#users }));
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * A helper to handle displaying and responding to the dialog.
   * @param {object} [options={}]                Additional options passed to the dialog.
   * @returns {Promise<Map<Actor5e, User>>}      Promise that resolves to a map of actors and the users who should
   *                                             handle the request for that actor.
   */
  static async getRecipients(options={}) {
    const app = new PartyRequestDialog(foundry.utils.mergeObject({
      buttons: [{
        default: true,
        icon: "fa-solid fa-bullhorn",
        label: game.i18n.localize("DND5E.CHATMESSAGE.REQUEST.Action.Post"),
        type: "submit"
      }]
    }, options));
    const { promise, resolve, reject } = Promise.withResolvers();
    const closeListener = app.addEventListener("close", () => reject(), { once: true });
    app.addEventListener("resolve", event => {
      app.removeEventListener("close", closeListener);
      resolve(event.detail);
    }, { once: true });
    app.render({ force: true });
    return promise;
  }

  /* -------------------------------------------- */

  /**
   * A helper to handle displaying and responding to the dialog.
   * @param {string} handler            Specific rest handler as defined in `CONFIG.DND5E.requests`.
   * @param {object} [messageData={}]   Additional data used to create the chat message.
   * @param {object} [options={}]       Additional options passed to the dialog.
   * @returns {Promise<ChatMessage5e>}  Promise that resolves to the created request chat message.
   * @throws if dialog is closed
   */
  static async sendRequest(handler, messageData={}, options={}) {
    const recipients = await this.getRecipients(options);

    messageData = foundry.utils.mergeObject({
      system: {
        handler,
        targets: Array.from(recipients.entries()).map(([actor, user]) => ({ actor: actor.id, user: user?.id }))
      },
      type: "request"
    }, messageData);

    return getDocumentClass("ChatMessage").create(messageData);
  }
}
