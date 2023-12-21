/**
 * Custom element that handles displaying active effects lists.
 */
export default class EffectsElement extends HTMLElement {
  connectedCallback() {
    this.#app = ui.windows[this.closest(".app")?.dataset.appid];

    for ( const control of this.querySelectorAll("[data-action]") ) {
      control.addEventListener("click", event => {
        this._onAction(event.currentTarget, event.currentTarget.dataset.action);
      });
    }

    new ContextMenu(this, "[data-effect-id]", [], {onOpen: element => {
      const effect = this.getEffect(element.dataset);
      if ( !effect ) return;
      ui.context.menuItems = this._getContextOptions(effect);
      Hooks.call("dnd5e.getActiveEffectContextOptions", effect, ui.context.menuItems);
    }});
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Reference to the application that contains this component.
   * @type {Application}
   */
  #app;

  /**
   * Reference to the application that contains this component.
   * @type {Application}
   * @protected
   */
  get _app() { return this.#app; }

  /* -------------------------------------------- */

  /**
   * Document whose effects are represented.
   * @type {Actor5e|Item5e}
   */
  get document() {
    return this._app.document;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare the data structure for Active Effects which are currently applied to an Actor or Item.
   * @param {ActiveEffect5e[]} effects  The array of Active Effect instances for which to prepare sheet data.
   * @returns {object}                  Data for rendering.
   */
  static prepareCategories(effects) {
    // Define effect header categories
    const categories = {
      temporary: {
        type: "temporary",
        label: game.i18n.localize("DND5E.EffectTemporary"),
        effects: []
      },
      passive: {
        type: "passive",
        label: game.i18n.localize("DND5E.EffectPassive"),
        effects: []
      },
      inactive: {
        type: "inactive",
        label: game.i18n.localize("DND5E.EffectInactive"),
        effects: []
      },
      suppressed: {
        type: "suppressed",
        label: game.i18n.localize("DND5E.EffectUnavailable"),
        effects: [],
        info: [game.i18n.localize("DND5E.EffectUnavailableInfo")]
      }
    };

    // Iterate over active effects, classifying them into categories
    for ( const e of effects ) {
      if ( e.isSuppressed ) categories.suppressed.effects.push(e);
      else if ( e.disabled ) categories.inactive.effects.push(e);
      else if ( e.isTemporary ) categories.temporary.effects.push(e);
      else categories.passive.effects.push(e);
    }
    categories.suppressed.hidden = !categories.suppressed.effects.length;
    return categories;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Prepare an array of context menu options which are available for owned ActiveEffect documents.
   * @param {ActiveEffect5e} effect  The ActiveEffect for which the context menu is activated.
   * @returns {ContextMenuEntry[]}   An array of context menu options offered for the ActiveEffect.
   * @protected
   */
  _getContextOptions(effect) {
    return [
      {
        name: "DND5E.ContextMenuActionEdit",
        icon: "<i class='fas fa-edit fa-fw'></i>",
        condition: () => effect.isOwner,
        callback: li => this._onAction(li[0], "edit")
      },
      {
        name: "DND5E.ContextMenuActionDuplicate",
        icon: "<i class='fas fa-copy fa-fw'></i>",
        condition: () => effect.isOwner,
        callback: li => this._onAction(li[0], "duplicate")
      },
      {
        name: "DND5E.ContextMenuActionDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        condition: () => effect.isOwner,
        callback: li => this._onAction(li[0], "delete")
      },
      {
        name: effect.disabled ? "DND5E.ContextMenuActionEnable" : "DND5E.ContextMenuActionDisable",
        icon: effect.disabled ? "<i class='fas fa-check fa-fw'></i>" : "<i class='fas fa-times fa-fw'></i>",
        condition: () => effect.isOwner,
        callback: li => this._onAction(li[0], "toggle")
      }
    ];
  }

  /* -------------------------------------------- */

  /**
   * Handle effects actions.
   * @param {Element} target  Button or context menu entry that triggered this action.
   * @param {string} action   Action being triggered.
   * @returns {Promise}
   * @protected
   */
  async _onAction(target, action) {
    const event = new CustomEvent("effect", {
      bubbles: true,
      cancelable: true,
      detail: action
    });
    if ( target.dispatchEvent(event) === false ) return;

    const dataset = target.closest("[data-effect-id]")?.dataset;
    const effect = this.getEffect(dataset);
    if ( (action !== "create") && !effect ) return;

    switch ( action ) {
      case "create":
        return this._onCreate(target);
      case "duplicate":
        return effect.clone({name: game.i18n.format("DOCUMENT.CopyOf", {name: effect.name})}, {save: true});
      case "edit":
        return effect.sheet.render(true);
      case "delete":
        return effect.deleteDialog();
      case "toggle":
        return effect.update({disabled: !effect.disabled});
    }
  }

  /* -------------------------------------------- */

  /**
   * Create a new effect.
   * @param {HTMLElement} target  Button that triggered this action.
   * @returns {Promise<ActiveEffect5e>}
   */
  async _onCreate(target) {
    const isActor = this.document instanceof Actor;
    const li = target.closest("li");
    return this.document.createEmbeddedDocuments("ActiveEffect", [{
      name: isActor ? game.i18n.localize("DND5E.EffectNew") : this.document.name,
      icon: isActor ? "icons/svg/aura.svg" : this.document.img,
      origin: this.document.uuid,
      "duration.rounds": li.dataset.effectType === "temporary" ? 1 : undefined,
      disabled: li.dataset.effectType === "inactive"
    }]);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Fetch an effect from this document, or any embedded items if this document is an actor.
   * @param {object} data
   * @param {string} data.effectId    ID of the effect to fetch.
   * @param {string} [data.parentId]  ID of the parent item containing the effect.
   * @returns {ActiveEffect5e}
   */
  getEffect({ effectId, parentId }={}) {
    if ( !parentId ) return this.document.effects.get(effectId);
    return this.document.items.get(parentId).effects.get(effectId);
  }
}
