import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import DragDropApplicationMixin from "../../applications/mixins/drag-drop-mixin.mjs";
import PhysicalItemTemplate from "../item/templates/physical-item.mjs";

const { ArrayField, DocumentUUIDField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @typedef AwardMessageItemData
 * @property {"copy"|"move"} behavior  Whether the awarded items are copies, or should be detracted from an existing
 *                                     quantity of items.
 * @property {number} [quantity]       An explicit quantity. Either the quantity of items copied, or the maximum number
 *                                     to award from an existing quantity. If this value is not supplied, and the
 *                                     behavior is "move", then the maximum quantity is assumed.
 * @property {string} uuid             The Item UUID.
 */

/**
 * Custom chat message type used for awarding items.
 * @property {AwardMessageItemData[]} items  Awarded item data.
 */
export default class AwardMessageData extends DragDropApplicationMixin(ChatMessageDataModel) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      items: new ArrayField(new SchemaField({
        behavior: new StringField({ choices: ["move", "copy"], initial: "copy", blank: false, required: true }),
        quantity: new NumberField({ integer: true, positive: true }),
        uuid: new DocumentUUIDField({ type: "Item" }),
      }))
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/award-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(element) {
    super._onRender(element);
    new CONFIG.ux.DragDrop({
      dragSelector: ".draggable",
      callbacks: {
        dragend: this._onDragEnd.bind(this),
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this)
      }
    }).bind(element);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return Object.assign(context, {
      items: (await Promise.all(this.items.map(async ({ behavior, uuid, quantity }) => {
        const item = await fromUuid(uuid);
        return { behavior, item, quantity: quantity ?? item?.system.quantity ?? 0 };
      }))).filter(d => d.item && d.quantity)
    });
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @override */
  _allowedDropBehaviors(event, data) {
    return new Set(["move", "copy"]);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDragOver(event) {
    super._onDragOver(event);
    event.preventDefault();
    event.stopPropagation();
    document.querySelectorAll(".chat-sidebar").forEach(el => el.classList.remove("item-drop"));
  }

  /* -------------------------------------------- */

  /**
   * Handle a drag start operation.
   * @param {DragEvent} event
   * @protected
   */
  _onDragStart(event) {
    const { itemUuid } = event.target.closest("[data-item-uuid]")?.dataset ?? {};
    if ( !itemUuid ) return;
    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      uuid: itemUuid,
      messageId: this.parent.id
    }));
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping additional items onto this card.
   * @param {DragEvent} event
   * @returns {Promise<ChatMessage5e>}
   * @protected
   */
  async _onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const behavior = this._dropBehavior(event);
    const data = CONFIG.ux.TextEditor.getDragEventData(event);
    if ( data.type !== "Item" ) return;
    const item = await Item.implementation.fromDropData(data);
    const isPhysical = item.system.constructor._schemaTemplates?.includes(PhysicalItemTemplate);
    if ( !isPhysical ) return;
    // TODO: Prompt for quantity.
    const items = this.toObject().items;
    const update = { behavior, uuid: item.uuid };
    const existing = items.find(i => i.uuid === item.uuid);
    if ( existing ) foundry.utils.mergeObject(existing, update);
    else items.push(update);
    return this.parent.update({ "system.items": items });
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle follow-up actions after an Actor claims an Item award.
   * @param {Item5e} item     The Item that was claimed.
   * @param {object} options  The Item creation options.
   * @returns {Promise<ChatMessage5e>}
   */
  static async onCreateItem(item, options) {
    const data = foundry.utils.getProperty(options, "dnd5e.awardMessage");
    const message = game.messages.get(data?.id);
    if ( !message || !game.user.isActiveGM ) return;
    const { items } = message.system.toObject();
    // TODO: Deduct quantity.
    const { behavior } = items.findSplice(i => i.uuid === data.item) ?? {};
    if ( !behavior ) return;
    if ( behavior === "move" ) await (await fromUuid(data.item)).delete();
    if ( items.length ) return message.update({ "system.items": items });
    return message.delete();
  }
}
