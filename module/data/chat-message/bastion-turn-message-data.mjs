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
        claimed: new BooleanField(),
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
  _getEnrichmentOptions() {
    return { avatar: false };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(element, options={}) {
    super._onRender(element, options);
    element.classList.add("compact");
    if ( !this.actor?.isOwner ) return;
    element.querySelectorAll(".item-summary > li:not(.claimed)").forEach(async el => {
      const { index, quantity, uuid } = el.dataset;
      const item = await fromUuid(uuid);
      if ( !item ) return;
      el.draggable = true;
      el.addEventListener("dragstart", event => {
        this.#onDragItem(event, item, {
          "flags.dnd5e.bastionClaim": { index: Number(index), messageId: this.parent.id },
          "system.quantity": Number(quantity)
        });
      });
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const context = {};

    context.items = (await Promise.all(this.items.map(async ({ claimed, uuid, quantity }, index) => {
      const item = await fromUuid(uuid);
      if ( !item ) return null;
      const { name, img } = item;
      return { claimed, img, index, name, quantity, uuid };
    }))).filter(_ => _);

    const actor = this.actor;
    context.orders = this.orders.map(({ id, order }) => {
      const facility = actor?.items.get(id);
      return facility ? {
        name: facility.name,
        contentLink: facility.toAnchor().outerHTML,
        order: CONFIG.DND5E.facilities.orders[order]?.label
      } : null;
    }).filter(_ => _);

    context.supplements = [];
    if ( this.gold.value ) {
      context.supplements.push(`
        <strong>${_loc("DND5E.CurrencyGP")}</strong>
        ${formatNumber(this.gold.value)}
        (${_loc(`DND5E.Bastion.Gold.${this.gold.claimed ? "Claimed" : "Unclaimed"}`)})
      `);
    }
    if ( this.gold.value && !this.gold.claimed ) context.buttonGroups = {
      gold: { entries: [{
        action: "claimGold",
        icon: "fa-solid fa-coins",
        label: "DND5E.Bastion.Gold.Claim"
      }] }
    };

    return context;
  }

  /* -------------------------------------------- */
  /*  Claiming                                    */
  /* -------------------------------------------- */

  /**
   * Claim gold or an item.
   * @param {object} options  Operation options.
   * @returns {Promise|void}
   */
  static applyClaim(options) {
    const claim = options.dnd5e?.bastionClaim;
    if ( !claim ) return;
    const message = game.messages.get(claim.messageId);
    if ( !(message?.system instanceof BastionTurnMessageData) ) return;

    if ( claim.gold ) {
      if ( message.system.gold.claimed ) return;
      return message.update({ "system.gold.claimed": true });
    }

    const items = message.system.toObject().items;
    if ( !items[claim.index] || items[claim.index].claimed ) return;
    items[claim.index].claimed = true;
    return message.update({ "system.items": items });
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
    const gp = this.actor?.system.currency?.[CONFIG.DND5E.defaultCurrency];
    if ( !this.gold.value || this.gold.claimed || (gp === undefined) ) return;
    await this.actor.update(
      { [`system.currency.${CONFIG.DND5E.defaultCurrency}`]: gp + this.gold.value },
      { dnd5e: { bastionClaim: { gold: true, messageId: this.parent.id } } }
    );
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
    if ( !foundry.utils.isEmpty(updates) ) item.updateSource(updates);
    event.dataTransfer.setData("text/plain", JSON.stringify({
      data: game.items.fromCompendium(item, { keepId: true }), type: "Item"
    }));
  }

}
