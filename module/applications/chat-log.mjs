import ChatMessage5e from "../documents/chat-message.mjs";

/**
 * Custom implementation of the chat log to support saving tray states.
 */
export default class ChatLog5e extends (foundry.applications?.sidebar?.tabs?.ChatLog ?? ChatLog) {
  /** @inheritDoc */
  async updateMessage(message, notify=false) {
    const element = this.element instanceof HTMLElement ? this.element : this.element[0];
    const card = element.querySelector(`.message[data-message-id="${message.id}"]`);
    if ( card ) message._trayStates = new Map([
      ...Array.from(card.querySelectorAll(".card-tray"))
        .map(t => [t.className.replace(" collapsed", ""), t.classList.contains("collapsed")]),
      ...Array.from(card.querySelectorAll(ChatMessage5e.TRAY_TYPES.join(", "))).map(t => [t.tagName, t.open])
    ]);
    await super.updateMessage(message, notify);
  }
}
