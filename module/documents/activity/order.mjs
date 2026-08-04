import ActivityMixin from "./mixin.mjs";
import BaseOrderActivityData from "../../data/activity/order-data.mjs";
import OrderUsageDialog from "../../applications/activity/order-usage-dialog.mjs";

/**
 * @import { OrderUseConfiguration } from "./_types.mjs";
 */

/**
 * An activity for issuing an order to a facility.
 */
export default class OrderActivity extends ActivityMixin(BaseOrderActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    type: "order",
    img: "systems/dnd5e/icons/svg/activity/order.svg",
    title: "DND5E.FACILITY.Order.Issue",
    usage: {
      dialog: OrderUsageDialog,
      messageType: "bastionOrder"
    }
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get canUse() {
    return super.canUse
      // Don't allow usage if facility is already executing the same order or has been disabled by attack
      && !this.inProgress && !this.item.system.disabled
      // Enlarge order cannot be executed if facility is already maximum size
      && ((this.order !== "enlarge") || (this.parent.size !== "vast"));
  }

  /* -------------------------------------------- */

  /**
   * Is this order currently in the process of being executed by its facility?
   * @type {boolean}
   */
  get inProgress() {
    const { order, paid, value } = this.parent.progress;
    if ( order !== this.order ) return false;
    return (value > 0) || paid;
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
    if ( costs.days ) updates["system.progress"] = { value: 0, max: costs.days, order: this.order, paid: false };
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

  /** @inheritDoc */
  _finalizeMessageConfig(usageConfig, messageConfig, results) {
    super._finalizeMessageConfig(usageConfig, messageConfig, results);
    const { costs, craft, trade } = usageConfig;
    const system = { costs: costs ?? {}, order: this.order };
    if ( craft?.item ) system.craft = { item: craft.item, quantity: craft.quantity };
    if ( trade ) system.trade = {
      creatures: this._resolveTradedLivestock(trade),
      sell: trade.sell === true,
      stocked: trade.stock?.stocked === true,
      value: trade.stock?.value ?? (trade.sell ? trade.creatures?.price : null) ?? null
    };
    foundry.utils.mergeObject(messageConfig.data, { system });
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
      updates["system.trade.pending.value"] = trade.sell ? (trade.creatures.price ?? 0) : costs.gold;
      updates["system.trade.pending.creatures"] = this._resolveTradedLivestock(trade);

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
  _requiresConfigurationDialog(config) {
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Determine the livestock involved in a trade order, resolved before any facility updates are applied.
   * @param {object} trade  Trade configuration from the usage config.
   * @returns {string[]}    UUIDs of the livestock being bought or sold.
   * @protected
   */
  _resolveTradedLivestock(trade) {
    if ( !trade?.creatures ) return [];
    if ( trade.sell ) return this.item.system.trade.creatures.value.filter((_, i) => trade.creatures.sell?.[i]);
    return (trade.creatures.buy ?? []).filter(_ => _);
  }

}
