import { formatNumber } from "../../utils.mjs";
import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, DocumentUUIDField, NumberField, SchemaField, StringField
} = foundry.data.fields;

/**
 * @import { BastionTurnMessageSystemData } from "./_types.mjs";
 */

/**
 * Custom chat message type used for a turn on a single bastion.
 * @extends {ChatMessageDataModel<BastionTurnMessageSystemData>}
 * @mixes BastionTurnMessageSystemData
 */
export default class BastionTurnMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      gold: new SchemaField({
        claimed: new BooleanField(),
        value: new NumberField({ min: 0 })
      }),
      items: new ArrayField(new SchemaField({
        quantity: new NumberField({ integer: true, positive: true }),
        uuid: new DocumentUUIDField({ type: "Item" })
      })),
      orders: new ArrayField(new SchemaField({
        id: new DocumentIdField(),
        order: new StringField()
      }))
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    actions: {
      claimGold: BastionTurnMessageData.#onClaimGold,
      viewItem: BastionTurnMessageData.#onViewItem
    },
    template: "systems/dnd5e/templates/chat/bastion-turn-summary.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The actor for the chat message.
   * @type {Actor5e}
   */
  get actor() {
    return this.parent.getAssociatedActor();
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const context = {};

    context.items = (await Promise.all(this.items.map(async ({ uuid, quantity }) => {
      const item = await fromUuid(uuid);
      if ( !item ) return null;
      const { name, img } = item;
      return { img, name, quantity, uuid };
    }))).filter(_ => _);

    const actor = this.actor;
    context.orders = this.orders.map(({ id, order }) => {
      const facility = actor.items.get(id);
      return facility ? {
        name: facility.name,
        contentLink: facility.toAnchor().outerHTML,
        order: CONFIG.DND5E.facilities.orders[order]?.label
      } : null;
    }).filter(_ => _);

    context.supplements = [];
    if ( this.gold.value ) {
      context.supplements.push(`
        <strong>${game.i18n.localize("DND5E.CurrencyGP")}</strong>
        ${formatNumber(this.gold.value)}
        (${game.i18n.localize(`DND5E.Bastion.Gold.${this.gold.claimed ? "Claimed" : "Unclaimed"}`)})
      `);
    }
    context.buttons = [];
    if ( this.gold.value && !this.gold.claimed ) {
      context.buttons.push({
        label: game.i18n.localize("DND5E.Bastion.Gold.Claim"),
        icon: '<i class="fa-solid fa-coins" inert></i>',
        dataset: { action: "claimGold" }
      });
    }

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(element) {
    super._onRender(element);
    if ( !this.actor?.isOwner ) return;

    element.querySelectorAll(".item-summary > li").forEach(async el => {
      const { uuid, quantity } = el.dataset;
      const item = await fromUuid(uuid);
      if ( !item ) return;
      el.draggable = true;
      el.addEventListener("dragstart", event => {
        this.#onDragItem(event, item, { "system.quantity": Number(quantity) });
      });
    });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle claiming generated gold.
   * @this {BastionTurnMessageData}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #onClaimGold(event, target) {
    const { gp } = this.actor?.system.currency ?? {};
    if ( !this.gold.value || this.gold.claimed || (gp === undefined) ) return;
    await this.actor.update({ "system.currency.gp": gp + this.gold.value });
    this.parent.update({ content, system: { gold: { claimed: true } } });
  }

  /* -------------------------------------------- */

  /**
   * Handle viewing a created item.
   * @this {BastionTurnMessageData}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #onViewItem(event, target) {
    const { uuid } = target.dataset;
    const item = await fromUuid(uuid);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /**
   * Handle dragging an item created as part of order completion.
   * @param {DragEvent} event    The initiating drag event.
   * @param {Item5e} item        The created item.
   * @param {object} [updates]   Updates to apply to the Item.
   */
  #onDragItem(event, item, updates={}) {
    // TODO: Need some way to mark the item as 'claimed' when it is dropped onto an Actor sheet.
    if ( !foundry.utils.isEmpty(updates) ) item.updateSource(updates);
    event.dataTransfer.setData("text/plain", JSON.stringify({
      data: game.items.fromCompendium(item, { keepId: true }), type: "Item"
    }));
  }

}
