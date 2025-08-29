import ChatMessage5e from "../documents/chat-message.mjs";
import DragDropApplicationMixin from "./mixins/drag-drop-mixin.mjs";
import DragDrop5e from "../drag-drop.mjs";
import PhysicalItemTemplate from "../data/item/templates/physical-item.mjs";

/**
 * Custom implementation of the chat log to support saving tray states.
 */
export default class ChatLog5e extends DragDropApplicationMixin(foundry.applications.sidebar.tabs.ChatLog) {
  /**
   * The active intersection observer.
   * @type {IntersectionObserver}
   */
  #intersections;

  /* -------------------------------------------- */

  /** @override */
  _allowedDropBehaviors(event, data) {
    return new Set(["move", "copy", "link"]);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachFrameListeners() {
    super._attachFrameListeners();
    new CONFIG.ux.DragDrop({
      callbacks: {
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);
  }

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
    for ( const { isIntersecting, target } of entries ) {
      const tray = target.querySelector("damage-application, effect-application");
      if ( tray ) tray.visible = isIntersecting;
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDragOver(event) {
    super._onDragOver(event);
    const data = DragDrop5e.getPayload(event);
    if ( data.type === "Item" ) this.element.classList.add("item-drop");
  }

  /* -------------------------------------------- */

  /**
   * Handle drops onto the chat log.
   * @param {DragEvent} event
   */
  async _onDrop(event) {
    event.preventDefault();
    const behavior = this._dropBehavior(event);
    const data = CONFIG.ux.TextEditor.getDragEventData(event);
    if ( data.type !== "Item" ) return;
    const item = await Item.implementation.fromDropData(data);
    const isPhysical = item.system.constructor._schemaTemplates?.includes(PhysicalItemTemplate);
    if ( !isPhysical ) return;
    // TODO: Prompt for quantity.
    await ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor: item.parent }),
      system: {
        items: [{ behavior, uuid: item.uuid }]
      },
      type: "award"
    });
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
