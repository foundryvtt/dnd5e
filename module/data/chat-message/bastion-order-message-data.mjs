import CurrencyManager from "../../applications/currency-manager.mjs";
import { bulkFromUuid } from "../../utils.mjs";
import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";

const {
  ArrayField, BooleanField, DocumentUUIDField, NumberField, SchemaField, StringField
} = foundry.data.fields;

/**
 * @import { BastionOrderMessageSystemData } from "./_types.mjs";
 */

/**
 * Custom chat message type used to represent an order issued to a bastion facility.
 * @extends {ChatMessageDataModel<BastionOrderMessageSystemData>}
 * @mixes BastionOrderMessageSystemData
 */
export default class BastionOrderMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      costs: new SchemaField({
        days: new NumberField({ integer: true, min: 0 }),
        gold: new NumberField({ integer: true, min: 0 }),
        paid: new BooleanField()
      }),
      craft: new SchemaField({
        item: new DocumentUUIDField({ type: "Item" }),
        quantity: new NumberField({ integer: true, positive: true })
      }),
      order: new StringField({ required: true }),
      trade: new SchemaField({
        creatures: new ArrayField(new DocumentUUIDField({ type: "Actor" })),
        sell: new BooleanField(),
        stocked: new BooleanField(),
        value: new NumberField({ integer: true, min: 0 })
      })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    actions: {
      pay: BastionOrderMessageData.#onPay
    },
    template: "systems/dnd5e/templates/chat/bastion-order-summary.hbs"
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

  /**
   * The facility that was issued this order.
   * @type {Item5e}
   */
  get item() {
    return this.parent.getAssociatedItem();
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const { actor, costs, craft, item, order, trade } = this;
    const context = { buttons: [], supplements: [] };

    if ( item ) {
      const facilityType = _loc(`DND5E.FACILITY.Types.${item.system.type.value.titleCase()}.Label.one`);
      context.description = {
        facilityType: facilityType.toLocaleLowerCase(game.i18n.lang),
        link: item.toAnchor().outerHTML,
        order: `DND5E.FACILITY.Orders.${order}.inf`
      };
    }

    if ( costs.days ) context.supplements.push({
      days: costs.days,
      detail: "DND5E.FACILITY.Costs.Days",
      label: "DND5E.DurationTime"
    });

    if ( costs.gold ) context.supplements.push({
      label: "DND5E.CurrencyGP",
      status: `DND5E.FACILITY.Costs.${costs.paid ? "Paid" : "Unpaid"}`,
      value: costs.gold
    });

    const crafted = craft.item ? await fromUuid(craft.item) : null;
    if ( crafted ) context.supplements.push({
      label: "DOCUMENT.Items",
      link: crafted.toAnchor().outerHTML,
      quantity: craft.quantity > 1 ? craft.quantity : null
    });

    if ( trade.stocked ) context.supplements.push({
      detail: "DND5E.FACILITY.Trade.Stocked.Supplement",
      label: "DND5E.FACILITY.Orders.trade.inf"
    });

    const currency = CONFIG.DND5E.currencies[CONFIG.DND5E.defaultCurrency]?.abbreviation ?? "";
    if ( trade.creatures.length ) {
      const documents = await bulkFromUuid(trade.creatures);
      const links = trade.creatures.map(uuid => documents.get(uuid)?.toAnchor().outerHTML).filter(_ => _);
      if ( links.length ) context.supplements.push({
        label: `DND5E.FACILITY.Trade.${trade.sell ? "Sell" : "Buy"}.Supplement`,
        link: game.i18n.getListFormatter({ style: "narrow" }).format(links)
      });
      if ( trade.value ) context.supplements.push({
        currency,
        label: "DND5E.FACILITY.Trade.Price.Label",
        value: trade.value
      });
    } else if ( trade.value && trade.sell ) context.supplements.push({
      currency,
      label: "DND5E.FACILITY.Trade.Sell.Supplement",
      value: trade.value
    });

    if ( costs.gold && !costs.paid && (game.user.isGM || actor?.isOwner) ) context.buttons.push({
      dataset: { action: "pay", method: "automatic" },
      icon: "fa-solid fa-coins",
      label: "DND5E.FACILITY.Costs.Automatic"
    }, {
      dataset: { action: "pay", method: "manual" },
      icon: "fa-solid fa-clipboard-check",
      label: "DND5E.FACILITY.Costs.Manual"
    });

    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle paying the gold cost of the order.
   * @this {BastionOrderMessageData}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   * @returns {Promise<void>}
   */
  static async #onPay(event, target) {
    const { actor, costs, item } = this;
    if ( !costs.gold || costs.paid ) return;
    target.disabled = true;
    try {
      if ( target.dataset.method === "automatic" ) {
        try {
          await CurrencyManager.deductActorCurrency(actor, costs.gold, CONFIG.DND5E.defaultCurrency, {
            recursive: true,
            priority: "high"
          });
        } catch ( err ) {
          ui.notifications.error(err.message);
          return;
        }
      }

      const operations = [
        { action: "update", documentName: "ChatMessage", updates: [{ _id: this.parent.id, "system.costs.paid": true }] }
      ];
      if ( item ) operations.push({
        action: "update",
        documentName: "Item",
        pack: item.pack,
        parent: actor,
        updates: [{ _id: item.id, "system.progress.paid": true }]
      });
      await foundry.documents.modifyBatch(operations);
    } finally {
      target.disabled = false;
    }
  }

}
