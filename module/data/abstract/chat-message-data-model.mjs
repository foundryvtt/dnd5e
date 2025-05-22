/**
 * @typedef {object} ChatMessageDataModelMetadata
 * @property {Record<string, ApplicationClickAction>} actions  Default click actions for buttons on the message.
 * @property {string} template                                 Template to use when rendering this message.
 */

/**
 * Abstract base class to add some shared functionality to all of the system's custom chat message types.
 * @abstract
 */
export default class ChatMessageDataModel extends foundry.abstract.TypeDataModel {

  /**
   * Metadata for this chat message type.
   * @type {ChatMessageDataModelMetadata}
   */
  static metadata = Object.freeze({
    actions: {
      use: ChatMessageDataModel.#useActivity
    },
    template: ""
  });

  get metadata() {
    return this.constructor.metadata;
  }

  /* -------------------------------------------- */

  /**
   * Template to use when rendering this message.
   * @type {string}
   */
  get template() {
    return this.metadata.template;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Perform any changes to the chat message's element before displaying in the list.
   * @param {HTMLElement} element  Element representing the entire chat message.
   * @param {object} options       Options forwarded to the render function.
   */
  async getHTML(element, options) {
    const rendered = await this.render(options);
    if ( rendered ) element.querySelector(".message-content").innerHTML = rendered;
    this.parent._enrichChatCard(element);

    const click = this.#onClick.bind(this);
    element.addEventListener("click", click);
    element.addEventListener("contextmenu", click);
    this._onRender(element);
  }

  /* -------------------------------------------- */

  /**
   * Render the contents of this chat message.
   * @param {object} options  Rendering options.
   * @returns {Promise<string>}
   */
  async render(options) {
    if ( !this.template ) return "";
    return foundry.applications.handlebars.renderTemplate(this.template, await this._prepareContext(options));
  }

  /* -------------------------------------------- */

  /**
   * Prepare application rendering context data for a given render request.
   * @param {object} options  Rendering options.
   * @returns {Promise<ApplicationRenderContext>}   Context data for the render operation.
   * @protected
   */
  async _prepareContext(options) {
    return {};
  }

  /* -------------------------------------------- */

  /**
   * Actions taken after the message has been rendered.
   * @param {HTMLElement} element
   * @protected
   */
  _onRender(element) {
    for ( const e of element.querySelectorAll(".item-tooltip") ) {
      const uuid = e.closest("[data-item-uuid]")?.dataset.itemUuid;
      if ( !uuid ) continue;
      Object.assign(e.dataset, {
        tooltip: `<section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>`,
        tooltipClass: "dnd5e2 dnd5e-tooltip item-tooltip",
        tooltipDirection: "LEFT"
      });
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle click events within the card.
   * @param {PointerEvent} event  Triggering pointer event.
   */
  #onClick(event) {
    const target = event.target.closest("[data-action]");
    if ( target ) {
      const action = target.dataset.action;
      let handler = this.metadata.actions[action];
      if ( handler ) {
        let buttons = [0];
        if ( typeof handler === "object" ) {
          buttons = handler.buttons;
          handler = handler.handler;
        }
        if ( buttons.includes(event.button) ) handler?.call(this, event, target);
      } else {
        this._onClickAction(event, target);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * A generic event handler for action clicks which can be extended by subclasses, called if no action is found in
   * the actions list in the message type's metadata.
   * @param {PointerEvent} event  Triggering pointer event.
   * @param {HTMLElement} target  Button with [data-action] defined.
   * @protected
   */
  _onClickAction(event, target) {}

  /* -------------------------------------------- */

  /**
   * Handle using an activity.
   * @this {ChatMessageDataModel}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #useActivity(event, target) {
    target.disabled = true;
    try {
      const activity = await fromUuid(target.closest("[data-activity-uuid]")?.dataset.activityUuid);
      await activity?.use({ event });
    } finally {
      target.disabled = false;
    }
  }
}
