import ChatMessage5e from "../documents/chat-message.mjs";

/**
 * Custom implementation of the chat log to support saving tray states.
 */
export default class ChatLog5e extends foundry.applications.sidebar.tabs.ChatLog {
  /**
   * The active intersection observer.
   * @type {IntersectionObserver}
   */
  #intersections;

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onFirstRender(context, options) {
    const scroll = this.element.querySelector(".chat-scroll");
    const log = this.element.querySelector(".chat-log");
    new MutationObserver(this.#onLogMutated.bind(this)).observe(log, { childList: true });
    this.#intersections = new IntersectionObserver(this.#onCardIntersects.bind(this), { root: scroll });
    return super._onFirstRender(context, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async updateMessage(message, notify=false) {
    const card = this.element.querySelector(`.message[data-message-id="${message.id}"]`);
    if ( card ) message._trayStates = new Map([
      ...Array.from(card.querySelectorAll(".card-tray"))
        .map(t => [t.className.replace(" collapsed", ""), t.classList.contains("collapsed")]),
      ...Array.from(card.querySelectorAll(ChatMessage5e.TRAY_TYPES.join(", "))).map(t => [t.tagName, t.open])
    ]);
    await super.updateMessage(message, notify);
  }

  /* -------------------------------------------- */

  /**
   * Record visibility of cards as they intersect the viewport.
   * @param {IntersectionObserverEntry[]} entries  The observed elements that have entered or left the viewport.
   */
  #onCardIntersects(entries) {
    const selector = ChatMessage5e.TRAY_TYPES.join(", ");
    for ( const { isIntersecting, target } of entries ) {
      target.querySelectorAll(selector).forEach(t => t.visible = isIntersecting);
    }
  }

  /* -------------------------------------------- */

  /**
   * React to changes in the chat log.
   * @param {MutationRecord[]} records  The change list.
   */
  #onLogMutated(records) {
    for ( const { addedNodes, removedNodes } of records ) {
      for ( const node of addedNodes ) this.#intersections.observe(node);
      for ( const node of removedNodes ) this.#intersections.unobserve(node);
    }
  }
}
