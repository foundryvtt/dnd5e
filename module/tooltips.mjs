/**
 * A class responsible for orchestrating tooltips in the system.
 */
export default class Tooltips5e {
  /* -------------------------------------------- */
  /*  Properties & Getters                        */
  /* -------------------------------------------- */

  /**
   * The handlebars template for rendering item tooltips.
   * @type {string}
   */
  static ITEM_TOOLTIP_TEMPLATE = "systems/dnd5e/templates/items/parts/item-tooltip.hbs";

  /**
   * The currently registered observer.
   * @type {MutationObserver}
   */
  #observer;

  /**
   * The tooltip element.
   * @type {HTMLElement}
   */
  get tooltip() {
    return document.getElementById("tooltip");
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Initialize the mutation observer.
   */
  observe() {
    this.#observer?.disconnect();
    this.#observer = new MutationObserver(this._onMutation.bind(this));
    this.#observer.observe(this.tooltip, { attributeFilter: ["class"] });
  }

  /* -------------------------------------------- */

  /**
   * Handle a mutation event.
   * @param {MutationRecord[]} mutationList  The list of changes.
   * @protected
   */
  _onMutation(mutationList) {
    let isActive = false;
    const tooltip = this.tooltip;
    for ( const { type, attributeName } of mutationList ) {
      if ( (type === "attributes") && (attributeName === "class") ) isActive = tooltip.classList.contains("active");
    }
    if ( isActive ) this._onTooltipActivate();
  }

  /* -------------------------------------------- */

  /**
   * Handle tooltip activation.
   * @protected
   */
  async _onTooltipActivate() {
    const uuid = this.tooltip.querySelector(".loading[data-uuid]")?.dataset.uuid;
    const doc = await fromUuid(uuid);
    if ( doc instanceof dnd5e.documents.Item5e ) return this._onHoverItem(doc);
    if ( doc instanceof dnd5e.documents.Actor5e ) return this._onHoverActor(doc);
  }

  /* -------------------------------------------- */

  /**
   * Handle hovering some part of an actor's sheet.
   * @param {Actor5e} actor  The actor.
   * @protected
   */
  async _onHoverActor(actor) {
    const { attribution, attributionCaption } = game.tooltip.element.dataset;
    if ( !attribution ) return;
    this.tooltip.innerHTML = await actor.getAttributionData(attribution, { title: attributionCaption });
  }

  /* -------------------------------------------- */

  /**
   * Handle hovering over an Item and showing its tooltip.
   * @param {Item5e} item  The item being hovered.
   * @protected
   */
  async _onHoverItem(item) {
    const data = await item.getTooltipData({ secrets: item.isOwner });
    this.tooltip.innerHTML = await renderTemplate(this.constructor.ITEM_TOOLTIP_TEMPLATE, data);
    requestAnimationFrame(() => this._positionItemTooltip());
  }

  /* -------------------------------------------- */

  /**
   * Position a tooltip after rendering.
   * @protected
   */
  _positionItemTooltip() {
    const tooltip = this.tooltip
    const { clientWidth, clientHeight } = document.documentElement;
    const tooltipBox = tooltip.getBoundingClientRect();
    const targetBox = game.tooltip.element.getBoundingClientRect();
    const maxTop = clientHeight - tooltipBox.height;
    const top = Math.min(maxTop, targetBox.bottom - (targetBox.height + tooltipBox.height) / 2);
    const left = targetBox.left - tooltipBox.width - game.tooltip.constructor.TOOLTIP_MARGIN_PX;
    tooltip.style.top = `${Math.max(0, top)}px`;
    tooltip.style.right = "";
    if ( left > 0 ) tooltip.style.left = `${left}px`;
    else {
      const right = targetBox.right + game.tooltip.constructor.TOOLTIP_MARGIN_PX;
      tooltip.style.left = `${Math.min(right, clientWidth - tooltipBox.width)}px`;
    }

    // Set overflowing styles for item tooltips.
    if ( tooltip.classList.contains("item-tooltip") ) {
      const description = tooltip.querySelector(".description");
      description?.classList.toggle("overflowing", description.clientHeight < description.scrollHeight);
    }
  }
}
