/**
 * A class responsible for orchestrating tooltips in the system.
 */
export default class Tooltips5e {
  /* -------------------------------------------- */
  /*  Properties & Getters                        */
  /* -------------------------------------------- */

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
    this.#observer.observe(this.tooltip, { attributeFilter: ["class"], attributeOldValue: true });
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
    for ( const { type, attributeName, oldValue } of mutationList ) {
      if ( (type === "attributes") && (attributeName === "class") ) {
        const difference = new Set(tooltip.classList).difference(new Set(oldValue?.split(" ")));
        if ( difference.has("active") ) isActive = true;
      }
    }
    if ( isActive ) this._onTooltipActivate();
  }

  /* -------------------------------------------- */

  /**
   * Handle tooltip activation.
   * @protected
   * @returns {Promise}
   */
  async _onTooltipActivate() {
    // General content links
    if ( game.tooltip.element?.classList.contains("content-link") ) {
      const doc = await fromUuid(game.tooltip.element.dataset.uuid);
      return this._onHoverContentLink(doc);
    }

    // Sheet-specific tooltips
    else {
      const uuid = this.tooltip.querySelector(".loading[data-uuid]")?.dataset.uuid;
      const doc = await fromUuid(uuid);
      if ( doc instanceof dnd5e.documents.Item5e ) return this._onHoverContentLink(doc);
      if ( doc instanceof dnd5e.documents.Actor5e ) return this._onHoverActor(doc);
    }
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
   * Handle hovering over a content link and showing rich tooltips if possible.
   * @param {Document} doc  The document linked by the content link.
   * @protected
   */
  async _onHoverContentLink(doc) {
    if ( !doc.system?.richTooltip ) return;
    const { content, classes } = await doc.system.richTooltip();
    this.tooltip.innerHTML = content;
    classes?.forEach(c => this.tooltip.classList.add(c));
    const { tooltipDirection } = game.tooltip.element.dataset;
    requestAnimationFrame(() => this._positionItemTooltip(tooltipDirection));
  }

  /* -------------------------------------------- */

  /**
   * Position a tooltip after rendering.
   * @param {string} [direction="LEFT"]  The direction to position the tooltip.
   * @protected
   */
  _positionItemTooltip(direction=TooltipManager.TOOLTIP_DIRECTIONS.LEFT) {
    const tooltip = this.tooltip;
    const { clientWidth, clientHeight } = document.documentElement;
    const tooltipBox = tooltip.getBoundingClientRect();
    const targetBox = game.tooltip.element.getBoundingClientRect();
    const maxTop = clientHeight - tooltipBox.height;
    const top = Math.min(maxTop, targetBox.bottom - ((targetBox.height + tooltipBox.height) / 2));
    const left = targetBox.left - tooltipBox.width - game.tooltip.constructor.TOOLTIP_MARGIN_PX;
    const right = targetBox.right + game.tooltip.constructor.TOOLTIP_MARGIN_PX;
    const { RIGHT, LEFT } = TooltipManager.TOOLTIP_DIRECTIONS;
    if ( (direction === LEFT) && (left < 0) ) direction = RIGHT;
    else if ( (direction === RIGHT) && (right + targetBox.width > clientWidth) ) direction = LEFT;
    tooltip.style.top = `${Math.max(0, top)}px`;
    tooltip.style.right = "";
    if ( direction === RIGHT ) tooltip.style.left = `${Math.min(right, clientWidth - tooltipBox.width)}px`;
    else tooltip.style.left = `${Math.max(0, left)}px`;

    // Set overflowing styles for item tooltips.
    if ( tooltip.classList.contains("item-tooltip") ) {
      const description = tooltip.querySelector(".description");
      description?.classList.toggle("overflowing", description.clientHeight < description.scrollHeight);
    }
  }

  /* -------------------------------------------- */
  /*  Static Helpers                              */
  /* -------------------------------------------- */

  /**
   * Intercept middle-click listeners to prevent scrolling behavior inside a locked tooltip when attempting to lock
   * another tooltip.
   */
  static activateListeners() {
    document.addEventListener("pointerdown", event => {
      if ( (event.button === 1) && event.target.closest(".locked-tooltip") ) {
        event.preventDefault();
      }
    }, { capture: true });
  }
}
