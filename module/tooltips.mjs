const TooltipManager = foundry.helpers.interaction.TooltipManager.implementation;

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
    return this.#tooltip;
  }

  #tooltip = document.getElementById("tooltip");

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

    const loading = this.tooltip.querySelector(".loading");

    // Sheet-specific tooltips
    if ( loading?.dataset.uuid ) {
      const doc = await fromUuid(loading.dataset.uuid);
      if ( doc instanceof dnd5e.documents.Actor5e ) return this._onHoverActor(doc);
      return this._onHoverContentLink(doc);
    }

    // Passive checks
    else if ( loading?.dataset.passive !== undefined ) {
      const { skill, ability, dc } = game.tooltip.element?.dataset ?? {};
      return this._onHoverPassive(skill, ability, dc);
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
    const { content, classes } = await (doc.richTooltip?.() ?? doc.system?.richTooltip?.() ?? {});
    if ( !content ) return;
    this.tooltip.innerHTML = content;
    this.tooltip.classList.remove("theme-dark");
    if ( classes?.length ) this.tooltip.classList.add(...classes);
    const { tooltipDirection } = game.tooltip.element.dataset;
    requestAnimationFrame(() => this._positionItemTooltip(tooltipDirection));
  }

  /* -------------------------------------------- */

  /**
   * Handle hovering a passive skill or ability check link to display results for primary party.
   * Either skill or ability (or both) must be provided.
   * @param {string} [skill]     Passive skill key. If undefined, this will be a passive ability check.
   * @param {string} [ability]   Passive ability key. If undefined, the skill's default ability is used.
   * @param {number} [dc]        DC against which to compare party values.
   * @protected
   */
  async _onHoverPassive(skill, ability, dc) {
    const skillConfig = CONFIG.DND5E.skills[skill];
    const abilityConfig = CONFIG.DND5E.abilities[ability ?? skillConfig.ability];

    let label;
    if ( skillConfig ) {
      label = game.i18n.format("DND5E.SkillPassiveSpecificHint", { skill: skillConfig.label, ability: abilityConfig.label });
    } else {
      // If no skill was provided, we're doing a passive ability check.
      // This isn't technically a thing in the rules, but we can support it anyway if people want to use it.
      label = game.i18n.format("DND5E.SkillPassiveHint", { skill: abilityConfig.label });
    }

    const party = game.actors.party;
    if ( !party ) {
      this.tooltip.innerHTML = label;
      return;
    }

    const context = { label, party: [] };
    for ( const member of party.system.members ) {
      const systemData = member.actor?.system;
      let passive;
      if ( skill && (!ability || (ability === skillConfig.ability)) ) {
        // Default passive skill check
        passive = systemData?.skills?.[skill]?.passive;
      } else if ( skill ) {
        // Passive ability check with custom ability
        const customSkillData = member.actor?._prepareSkill(skill, { ability });
        passive = customSkillData.passive;
      } else {
        // Passive ability check
        const abilityMod = systemData?.abilities?.[ability]?.mod;
        if ( abilityMod !== undefined ) passive = 10 + abilityMod;
      }

      if ( !passive ) continue;
      const data = { name: member.actor.name, img: member.actor.img, passive };
      if ( dc !== undefined ) data.status = passive >= dc ? "success" : "failure";
      context.party.push(data);
    }

    this.tooltip.classList.add("dnd5e-tooltip", "passive-tooltip", "dnd5e2", "themed", "theme-light");
    this.tooltip.classList.remove("theme-dark");
    this.tooltip.innerHTML = await foundry.applications.handlebars.renderTemplate(
      "systems/dnd5e/templates/journal/passive-tooltip.hbs", context
    );
    game.tooltip._setAnchor(TooltipManager.TOOLTIP_DIRECTIONS.DOWN);
  }

  /* -------------------------------------------- */

  /**
   * Position a tooltip after rendering.
   * @param {string} [direction]  The direction to position the tooltip.
   * @protected
   */
  _positionItemTooltip(direction) {
    if ( !direction ) {
      direction = TooltipManager.TOOLTIP_DIRECTIONS.LEFT;
      game.tooltip._setAnchor(direction);
    }

    const pos = this.tooltip.getBoundingClientRect();
    const dirs = TooltipManager.TOOLTIP_DIRECTIONS;
    const { innerHeight, innerWidth } = this.tooltip.ownerDocument.defaultView;
    switch ( direction ) {
      case dirs.UP:
        if ( pos.y - TooltipManager.TOOLTIP_MARGIN_PX <= 0 ) direction = dirs.DOWN;
        break;
      case dirs.DOWN:
        if ( pos.y + this.tooltip.offsetHeight > innerHeight ) direction = dirs.UP;
        break;
      case dirs.LEFT:
        if ( pos.x - TooltipManager.TOOLTIP_MARGIN_PX <= 0 ) direction = dirs.RIGHT;
        break;
      case dirs.RIGHT:
        if ( pos.x + this.tooltip.offsetWidth > innerWidth ) direction = dirs.LEFT;
        break;
    }

    game.tooltip._setAnchor(direction);

    // Set overflowing styles for item tooltips.
    if ( this.tooltip.classList.contains("item-tooltip") ) {
      const description = this.tooltip.querySelector(".description");
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
