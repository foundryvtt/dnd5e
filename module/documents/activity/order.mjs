import ActivityMixin from "./mixin.mjs";
import OrderActivityData from "../../data/activity/order-data.mjs";
import OrderUsageDialog from "../../applications/activity/order-usage-dialog.mjs";
import CurrencyManager from "../../applications/currency-manager.mjs";
import { formatNumber } from "../../utils.mjs";

/**
 * @typedef {ActivityUseConfiguration} OrderUseConfiguration
 * @property {object} [building]
 * @property {string} [building.size]            The size of facility to build.
 * @property {object} [costs]
 * @property {number} [costs.days]               The cost of executing the order, in days.
 * @property {number} [costs.gold]               The cost of executing the order, in gold.
 * @property {boolean} [costs.paid]              Whether the gold cost has been paid.
 * @property {object} [craft]
 * @property {string} [craft.item]               The item being crafted or harvested.
 * @property {number} [craft.quantity]           The quantity of items to harvest.
 * @property {object} [trade]
 * @property {boolean} [trade.sell]              Whether the trade was a sell operation.
 * @property {object} [trade.stock]
 * @property {boolean} [trade.stock.stocked]     Whether the order was to fully stock the inventory.
 * @property {boolean} [trade.stock.value]       The base value of goods transacted.
 * @property {object} [trade.creatures]
 * @property {string[]} [trade.creatures.buy]    Additional animals purchased.
 * @property {boolean[]} [trade.creatures.sell]  Whether a creature in a given slot was sold.
 * @property {number} [trade.creatures.price]    The base value of the animals sold.
 */

/**
 * An activity for issuing an order to a facility.
 */
export default class OrderActivity extends ActivityMixin(OrderActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    type: "order",
    img: "systems/dnd5e/icons/svg/activity/order.svg",
    title: "DND5E.FACILITY.Order.Issue",
    usage: {
      actions: {
        pay: OrderActivity.#onPayOrder
      },
      chatCard: "systems/dnd5e/templates/chat/order-activity-card.hbs",
      dialog: OrderUsageDialog
    }
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get canUse() {
    return super.canUse
      // Don't allow usage if facility is already executing the same order
      && !this.inProgress
      // Enlarge order cannot be executed if facility is already maximum size
      && ((this.order !== "enlarge") || (this.parent.size !== "vast"));
  }

  /* -------------------------------------------- */

  /**
   * Is this order currently in the process of being executed by its facility?
   * @type {boolean}
   */
  get inProgress() {
    if ( this.parent.progress.order !== this.order ) return false;
    // TODO: Ideally this would also check to see if the order has already been paid,
    // but that information is only part of the chat message and there isn't a clean
    // way to retrieve it at the moment
    return this.parent.progress.value > 0;
  }

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /**
   * Update building configuration.
   * @param {OrderUseConfiguration} usageConfig  Order configuration.
   * @param {object} updates                     Item updates.
   * @protected
   */
  _finalizeBuild(usageConfig, updates) {
    updates["system.building.size"] = usageConfig.building.size;
  }

  /* -------------------------------------------- */

  /**
   * Update costs.
   * @param {OrderUseConfiguration} usageConfig  Order configuration.
   * @param {object} updates                     Item updates.
   * @protected
   */
  _finalizeCosts(usageConfig, updates) {
    const { costs } = usageConfig;
    if ( costs.days ) updates["system.progress"] = { value: 0, max: costs.days, order: this.order };
  }

  /* -------------------------------------------- */

  /**
   * Update crafting configuration.
   * @param {OrderUseConfiguration} usageConfig  Order configuration.
   * @param {object} updates                     Item updates.
   * @protected
   */
  _finalizeCraft(usageConfig, updates) {
    const { craft } = usageConfig;
    updates["system.craft"] = { item: craft.item, quantity: 1 };
    if ( this.order === "harvest" ) updates["system.craft"].quantity = craft.quantity;
  }

  /* -------------------------------------------- */

  /**
   * Update facility size.
   * @param {OrderUseConfiguration} usageConfig  Order configuration.
   * @param {object} updates                     Item updates.
   * @protected
   */
  _finalizeEnlarge(usageConfig, updates) {
    // Special facilities enlarge immediately.
    if ( (this.item.system.type.value !== "special") || (this.item.system.size === "vast") ) return;
    const sizes = Object.entries(CONFIG.DND5E.facilities.sizes).sort((a, b) => a.value - b.value);
    const index = sizes.findIndex(([size]) => size === this.item.system.size);
    updates["system.size"] = sizes[index + 1][0];
  }

  /* -------------------------------------------- */

  /**
   * Update trading configuration.
   * @param {OrderUseConfiguration} usageConfig  Order configuration.
   * @param {object} updates                     Item updates.
   * @protected
   */
  _finalizeTrade(usageConfig, updates) {
    const { costs, trade } = usageConfig;
    const { system } = this.item;
    updates["system.trade.pending.operation"] = trade.sell ? "sell" : "buy";
    updates["system.trade.pending.creatures"] = [];
    updates["system.trade.pending.value"] = null;
    if ( trade.stock ) {
      if ( "stocked" in trade.stock ) {
        updates["system.trade.pending.stocked"] = trade.stock.stocked;
        updates["system.trade.pending.operation"] = trade.stock.stocked ? "buy" : null;
      }
      else updates["system.trade.pending.value"] = trade.stock.value;
    }
    if ( trade.creatures ) {
      let creatures = (trade.creatures.buy ?? []).filter(_ => _);
      if ( trade.sell ) {
        creatures = [];
        for ( let i = 0; i < trade.creatures.sell?.length ?? 0; i++ ) {
          const sold = trade.creatures.sell[i];
          if ( sold ) creatures.push(system.trade.creatures.value[i]);
        }
      }
      updates["system.trade.pending.value"] = trade.sell ? (trade.creatures.price ?? 0) : costs.gold;
      updates["system.trade.pending.creatures"] = creatures;

      // Sold livestock are removed immediately. Bought livestock remain pending until the order is complete.
      if ( trade.sell ) {
        updates["system.trade.creatures.value"] = system.trade.creatures.value.filter((_, i) => {
          return !trade.creatures.sell[i];
        });
      }
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _finalizeUsage(usageConfig, results) {
    const updates = {};
    switch ( this.order ) {
      case "build": this._finalizeBuild(usageConfig, updates); break;
      case "craft":
      case "harvest":
        this._finalizeCraft(usageConfig, updates);
        break;
      case "enlarge": this._finalizeEnlarge(usageConfig, updates); break;
      case "trade": this._finalizeTrade(usageConfig, updates); break;
    }
    this._finalizeCosts(usageConfig, updates);
    return this.item.update(updates);
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareUsageConfig(config) {
    config.consume = false;
    return config;
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareUsageScaling(usageConfig, messageConfig, item) {
    // FIXME: No scaling happening here, but this is the only context we have both usageConfig and messageConfig.
    const { costs, craft, trade } = usageConfig;
    messageConfig.data.flags.dnd5e.order = { costs, craft, trade };
  }

  /* -------------------------------------------- */

  /** @override */
  _requiresConfigurationDialog(config) {
    return true;
  }

  /* -------------------------------------------- */

  /** @override */
  _usageChatButtons(message) {
    const { costs } = message.data.flags.dnd5e.order;
    if ( !costs.gold || costs.paid ) return [];
    return [{
      label: game.i18n.localize("DND5E.FACILITY.Costs.Automatic"),
      icon: '<i class="fas fa-coins"></i>',
      dataset: { action: "pay", method: "automatic" }
    }, {
      label: game.i18n.localize("DND5E.FACILITY.Costs.Manual"),
      icon: '<i class="fas fa-clipboard-check"></i>',
      dataset: { action: "pay", method: "manual" }
    }];
  }

  /* -------------------------------------------- */

  /** @override */
  async _usageChatContext(message) {
    const { costs, craft, trade } = message.data.flags.dnd5e.order;
    const { type } = this.item.system;
    const supplements = [];
    if ( costs.days ) supplements.push(`
      <strong>${game.i18n.localize("DND5E.DurationTime")}</strong>
      ${game.i18n.format("DND5E.FACILITY.Costs.Days", { days: costs.days })}
    `);
    if ( costs.gold ) supplements.push(`
      <strong>${game.i18n.localize("DND5E.CurrencyGP")}</strong>
      ${formatNumber(costs.gold)}
      (${game.i18n.localize(`DND5E.FACILITY.Costs.${costs.paid ? "Paid" : "Unpaid"}`)})
    `);
    if ( craft?.item ) {
      const item = await fromUuid(craft.item);
      supplements.push(`
        <strong>${game.i18n.localize("DOCUMENT.Items")}</strong>
        ${craft.quantity > 1 ? `${craft.quantity}&times;` : ""}
        ${item.toAnchor().outerHTML}
      `);
    }
    if ( trade?.stock?.value && trade.sell ) supplements.push(`
      <strong>${game.i18n.localize("DND5E.FACILITY.Trade.Sell.Supplement")}</strong>
      ${formatNumber(trade.stock.value)}
      ${CONFIG.DND5E.currencies.gp?.abbreviation ?? ""}
    `);
    if ( trade?.creatures ) {
      const creatures = [];
      if ( trade.sell ) {
        for ( let i = 0; i < trade.creatures.sell.length; i++ ) {
          const sold = trade.creatures.sell[i];
          if ( sold ) creatures.push(await fromUuid(this.item.system.trade.creatures.value[i]));
        }
      }
      else creatures.push(...await Promise.all(trade.creatures.buy.filter(_ => _).map(uuid => fromUuid(uuid))));
      supplements.push(`
        <strong>${game.i18n.localize(`DND5E.FACILITY.Trade.${trade.sell ? "Sell" : "Buy"}.Supplement`)}</strong>
        ${game.i18n.getListFormatter({ style: "narrow" }).format(creatures.map(a => a.toAnchor().outerHTML))}
      `);
    }
    const facilityType = game.i18n.localize(`DND5E.FACILITY.Types.${type.value.titleCase()}.Label.one`);
    const buttons = this._usageChatButtons(message);
    return {
      supplements,
      buttons: buttons.length ? buttons : null,
      description: game.i18n.format("DND5E.FACILITY.Use.Description", {
        order: game.i18n.localize(`DND5E.FACILITY.Orders.${this.order}.inf`),
        link: this.item.toAnchor().outerHTML,
        facilityType: facilityType.toLocaleLowerCase(game.i18n.lang)
      })
    };
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle deducting currency for the order.
   * @this {OrderActivity}
   * @param {PointerEvent} event     The triggering event.
   * @param {HTMLElement} target     The button that was clicked.
   * @param {ChatMessage5e} message  The message associated with the activation.
   * @returns {Promise<void>}
   */
  static async #onPayOrder(event, target, message) {
    const { method } = target.dataset;
    const order = message.getFlag("dnd5e", "order");
    const config = foundry.utils.expandObject({ "data.flags.dnd5e.order": order });
    if ( method === "automatic" ) {
      try {
        await CurrencyManager.deductActorCurrency(this.actor, order.costs.gold, "gp", {
          recursive: true,
          priority: "high"
        });
      } catch(err) {
        ui.notifications.error(err.message);
        return;
      }
    }
    foundry.utils.setProperty(config, "data.flags.dnd5e.order.costs.paid", true);
    const context = await this._usageChatContext(config);
    const content = await foundry.applications.handlebars.renderTemplate(this.metadata.usage.chatCard, context);
    await message.update({ content, flags: config.data.flags });
  }
}
