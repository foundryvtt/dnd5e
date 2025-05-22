import ActivityUsageDialog from "./activity-usage-dialog.mjs";

const { BooleanField, DocumentUUIDField, NumberField, StringField } = foundry.data.fields;

/**
 * Dialog for configuring the usage of an order activity.
 */
export default class OrderUsageDialog extends ActivityUsageDialog {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      deleteOccupant: OrderUsageDialog.#onDeleteOccupant,
      removeCraft: OrderUsageDialog.#onRemoveCraft
    }
  };

  /** @override */
  static PARTS = {
    order: {
      template: "systems/dnd5e/templates/activity/order-usage.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Prepare render context for the build section.
   * @param {ApplicationRenderContext} context  Render context.
   * @param {HandlebarsRenderOptions} options   Render options.
   * @protected
   */
  _prepareBuildContext(context, options) {
    context.build = {
      choices: CONFIG.DND5E.facilities.sizes,
      field: new StringField({ nullable: false, blank: false, label: "DND5E.FACILITY.FIELDS.size.label" }),
      name: "building.size",
      value: this.config.building?.size ?? "cramped"
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare render context for the costs section.
   * @param {ApplicationRenderContext} context  Render context.
   * @param {HandlebarsRenderOptions} options   Render options.
   * @param {number} options.days               The cost in days.
   * @param {number} options.gold               The cost in gold.
   * @protected
   */
  _prepareCostsContext(context, { days, gold }) {
    const { duration } = game.settings.get("dnd5e", "bastionConfiguration");
    context.costs = {
      days: {
        field: new NumberField({ nullable: true, integer: true, min: 0, label: "DND5E.TimeDay" }),
        name: "costs.days",
        value: this.config.costs?.days ?? days ?? duration
      },
      gold: {
        field: new NumberField({ nullable: true, integer: true, min: 0, label: "DND5E.CurrencyGP" }),
        name: "costs.gold",
        value: this.config.costs?.gold ?? gold ?? 0
      }
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare render context for the craft section.
   * @param {ApplicationRenderContext} context  Render context.
   * @param {HandlebarsRenderOptions} options   Render options.
   * @protected
   */
  async _prepareCraftContext(context, options) {
    const { craft } = this.item.system;
    context.craft = {
      legend: game.i18n.localize(`DND5E.FACILITY.Orders.${this.activity.order}.present`),
      item: {
        field: new DocumentUUIDField(),
        name: "craft.item",
        value: this.config.craft?.item ?? ""
      }
    };

    if ( this.activity.order === "harvest" ) {
      context.craft.isHarvesting = true;
      context.craft.item.value = this.config.craft?.item ?? craft.item ?? "";
      context.craft.quantity = {
        field: new NumberField({ nullable: false, integer: true, positive: true }),
        name: "craft.quantity",
        value: this.config.craft?.quantity ?? craft.quantity ?? 1
      };
    } else {
      context.craft.baseItem = {
        field: new BooleanField({
          label: "DND5E.FACILITY.Craft.BaseItem.Label",
          hint: "DND5E.FACILITY.Craft.BaseItem.Hint"
        }),
        name: "craft.buyBaseItem",
        value: this.config.craft?.buyBaseItem ?? false
      };
    }

    if ( context.craft.item.value ) {
      const item = await fromUuid(context.craft.item.value);
      context.craft.value = {
        img: item.img,
        name: item.name,
        contentLink: item.toAnchor().outerHTML
      };
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare render context for the enlarge order.
   * @param {ApplicationRenderContext} context  Render context.
   * @param {HandlebarsRenderOptions} options   Render options.
   * @returns {{ days: number, gold: number }}  The costs associated with performing this order.
   * @protected
   */
  _prepareEnlargeContext(context, options) {
    const sizes = Object.entries(CONFIG.DND5E.facilities.sizes).sort((a, b) => a.value - b.value);
    const index = sizes.findIndex(([size]) => size === this.item.system.size);
    const [, current] = sizes[index];
    const [, target] = sizes[index + 1];
    context.description = `
      <span class="current">${current.label}</span>
      <span class="separator">➡</span>
      <span class="target">${target.label}</span>
    `;
    const days = this.item.system.type.value === "basic" ? target.days - current.days : 0;
    return { days, gold: target.value - current.value };
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareFooterContext(context, options) {
    context.buttons = [{
      action: "use",
      type: "button",
      icon: "fas fa-hand-point-right",
      label: "DND5E.FACILITY.Order.Execute"
    }];
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare render context for orders.
   * @param {ApplicationRenderContext} context  Render context.
   * @param {HandlebarsRenderOptions} options   Render options.
   * @protected
   */
  async _prepareOrderContext(context, options) {
    if ( this.activity.order === "enlarge" ) {
      const { days, gold } = this._prepareEnlargeContext(context, options);
      this._prepareCostsContext(context, { ...options, days, gold });
      return;
    }

    if ( this.activity.order === "build" ) {
      const { days, value: gold } = CONFIG.DND5E.facilities.sizes.cramped;
      this._prepareBuildContext(context, options);
      this._prepareCostsContext(context, { ...options, days, gold });
      return;
    }

    let { duration } = game.settings.get("dnd5e", "bastionConfiguration");
    if ( (this.activity.order === "craft") || (this.activity.order === "harvest") ) {
      await this._prepareCraftContext(context, options);
    }
    else if ( this.activity.order === "trade" ) await this._prepareTradeContext(context, options);
    else {
      const config = CONFIG.DND5E.facilities.orders[this.activity.order];
      if ( config?.duration ) duration = config.duration;
    }

    this._prepareCostsContext(context, { ...options, days: duration });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "order": await this._prepareOrderContext(context, options); break;
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare render context for the trade order.
   * @param {ApplicationRenderContext} context  Render context.
   * @param {HandlebarsRenderOptions} options   Render options.
   * @protected
   */
  async _prepareTradeContext(context, options) {
    const { trade } = this.item.system;
    if ( !trade.creatures.max && !trade.stock.max ) {
      context.trade = {
        stocked: {
          field: new BooleanField({
            label: "DND5E.FACILITY.Trade.Stocked.Label",
            hint: "DND5E.FACILITY.Trade.Stocked.Hint"
          }),
          name: "trade.stock.stocked",
          value: this.config.trade?.stock?.stocked ?? false
        }
      };
    } else {
      const isSelling = this.config.trade?.sell ?? false;
      context.trade = {
        sell: {
          field: new BooleanField({ label: "DND5E.FACILITY.Trade.Sell.Label" }),
          name: "trade.sell",
          value: isSelling
        }
      };

      if ( trade.stock.max ) {
        const max = isSelling ? trade.stock.value || 0 : trade.stock.max - (trade.stock.value ?? 0);
        const label = `DND5E.FACILITY.Trade.Stock.${isSelling ? "Sell" : "Buy"}`;
        context.trade.stock = {
          field: new NumberField({ label, max, min: 0, step: 1, nullable: false }),
          name: "trade.stock.value",
          value: this.config.trade?.stock?.value ?? 0
        };
      } else if ( trade.creatures.max ) {
        const sell = await Promise.all(trade.creatures.value.map(async (uuid, i) => {
          const doc = await fromUuid(uuid);
          return {
            contentLink: doc.toAnchor().outerHTML,
            field: new BooleanField(),
            name: "trade.creatures.sell",
            value: this.config.trade?.creatures?.sell?.[i] ?? false
          };
        }));
        const buy = await Promise.all(Array.fromRange(trade.creatures.max).map(async i => {
          let removable = true;
          let uuid = trade.creatures.value[i];
          if ( uuid ) removable = false;
          else uuid = this.config.trade?.creatures?.buy?.[i];
          const doc = await fromUuid(uuid);
          if ( doc ) return { removable, uuid, img: doc.img, name: doc.name };
          return { empty: true };
        }));
        context.trade.creatures = {
          buy, sell,
          hint: "DND5E.FACILITY.Trade.Creatures.Buy",
          price: {
            field: new NumberField({
              nullable: false, min: 0, integer: true,
              label: "DND5E.FACILITY.Trade.Price.Label",
              hint: "DND5E.FACILITY.Trade.Price.Hint"
            }),
            name: "trade.creatures.price",
            value: this.config.trade?.creatures?.price ?? 0
          }
        };
      }
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("drop", this._onDrop.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle drops onto the dialog.
   * @param {DragEvent} event  The drag-drop event.
   * @protected
   */
  _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( (data.type !== "Actor") || !data.uuid ) return;
    const { trade } = this.item.system;
    if ( !this.config.trade?.creatures?.buy ) {
      this.config.trade ??= {};
      this.config.trade.creatures ??= {};
      this.config.trade.creatures.buy = [];
    }
    const index = Math.max(trade.creatures.value.length, this.config.trade.creatures.buy.length);
    if ( index + 1 > trade.creatures.max ) return;
    this.config.trade.creatures.buy[index] = data.uuid;
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Prepare submission data for build orders.
   * @param {object} submitData  Submission data.
   * @protected
   */
  _prepareBuildData(submitData) {
    if ( (this.config.building?.size ?? "cramped") !== submitData.building?.size ) {
      const { days, value: gold } = CONFIG.DND5E.facilities.sizes[submitData.building.size];
      Object.assign(submitData.costs, { days, gold });
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare submission data for craft orders.
   * @param {object} submitData  Submission data.
   * @returns {Promise<void>}
   * @protected
   */
  async _prepareCraftData(submitData) {
    let recalculateCosts = submitData.craft.item !== this.config.craft?.item;
    recalculateCosts ||= submitData.craft.buyBaseItem !== this.config.craft?.buyBaseItem;
    if ( (this.activity.order === "craft") && recalculateCosts ) {
      const item = await fromUuid(submitData.craft.item);
      const { days, gold } = await item.system.getCraftCost({
        baseItem: submitData.craft.buyBaseItem ? "buy" : "craft"
      });
      Object.assign(submitData.costs, { days, gold });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareSubmitData(event, formData) {
    const submitData = await super._prepareSubmitData(event, formData);
    if ( "building" in submitData ) this._prepareBuildData(submitData);
    if ( submitData.craft?.item ) await this._prepareCraftData(submitData);
    if ( "trade" in submitData ) await this._prepareTradeData(submitData);
    return submitData;
  }

  /* -------------------------------------------- */

  /**
   * Prepare submission data for trade orders.
   * @param {object} submitData  Submission data.
   * @returns {Promise<void>}
   * @protected
   */
  async _prepareTradeData(submitData) {
    // Clear data when toggling trade mode.
    if ( ("trade" in this.config) && (submitData.trade.sell !== this.config.trade?.sell) ) {
      delete this.config.trade.stock;
      delete this.config.trade.creatures;
      submitData.costs.gold = 0;
    }

    if ( ("stock" in submitData.trade) && !submitData.trade.sell ) {
      submitData.costs.gold = submitData.trade.stock.value;
    }

    if ( "creatures" in submitData.trade && !submitData.trade.sell ) {
      const buy = [];
      const { creatures } = submitData.trade;
      Object.keys(creatures.buy ?? {}).forEach(k => buy[k] = creatures.buy[k]);
      submitData.trade.creatures.buy = buy;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle removing a configured occupant.
   * @this {OrderUsageDialog}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The event target.
   */
  static #onDeleteOccupant(event, target) {
    const { index } = target.closest("[data-index]")?.dataset ?? {};
    this.config.trade.creatures.buy.splice(index, 1);
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle clearing the currently configured item for crafting.
   * @this {OrderUsageDialog}
   */
  static #onRemoveCraft() {
    delete this.config.craft.item;
    this.render();
  }
}
