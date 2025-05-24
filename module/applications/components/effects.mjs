import Actor5e from "../../documents/actor/actor.mjs";
import {staticID} from "../../utils.mjs";
import ContextMenu5e from "../context-menu.mjs";

/**
 * Custom element that handles displaying active effects lists.
 */
export default class EffectsElement extends HTMLElement {
  connectedCallback() {
    if ( this.#app ) return;
    this.#app = foundry.applications.instances.get(this.closest(".application")?.id)
      ?? ui.windows[this.closest(".app")?.dataset.appid];

    for ( const control of this.querySelectorAll("[data-action]") ) {
      control.addEventListener("click", event => {
        this._onAction(event.currentTarget, event.currentTarget.dataset.action);
      });
    }

    for ( const source of this.querySelectorAll(".effect-source a") ) {
      source.addEventListener("click", this._onClickEffectSource.bind(this));
    }

    for ( const control of this.querySelectorAll("[data-context-menu]") ) {
      control.addEventListener("click", ContextMenu5e.triggerEvent);
    }

    const MenuCls = this.hasAttribute("v2") ? ContextMenu5e : ContextMenu;
    new MenuCls(this, "[data-effect-id]", [], { onOpen: element => {
      const effect = this.getEffect(element.dataset);
      if ( !effect ) return;
      ui.context.menuItems = this._getContextOptions(effect);
      Hooks.call("dnd5e.getActiveEffectContextOptions", effect, ui.context.menuItems);
    }, jQuery: true });
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
  get app() { return this.#app; }

  /* -------------------------------------------- */

  /**
   * Document whose effects are represented.
   * @type {Actor5e|Item5e}
   */
  get document() {
    return this.app.document;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare the data structure for Active Effects which are currently applied to an Actor or Item.
   * @param {ActiveEffect5e[]} effects         The array of Active Effect instances for which to prepare sheet data.
   * @param {object} [options={}]
   * @param {Actor5e|Item5e} [options.parent]  Document that owns these active effects.
   * @returns {object}                  Data for rendering.
   */
  static prepareCategories(effects, { parent }={}) {
    // Define effect header categories
    const categories = {
      enchantment: {
        type: "enchantment",
        label: game.i18n.localize("DND5E.ENCHANTMENT.Category.General"),
        effects: [],
        isEnchantment: true
      },
      temporary: {
        type: "temporary",
        label: game.i18n.localize("DND5E.EffectTemporary"),
        effects: []
      },
      enchantmentActive: {
        type: "activeEnchantment",
        label: game.i18n.localize("DND5E.ENCHANTMENT.Category.Active"),
        effects: [],
        isEnchantment: true
      },
      passive: {
        type: "passive",
        label: game.i18n.localize("DND5E.EffectPassive"),
        effects: []
      },
      enchantmentInactive: {
        type: "inactiveEnchantment",
        label: game.i18n.localize("DND5E.ENCHANTMENT.Category.Inactive"),
        effects: [],
        isEnchantment: true
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
        disabled: true,
        info: [game.i18n.localize("DND5E.EffectUnavailableInfo")]
      }
    };

    // Iterate over active effects, classifying them into categories
    for ( const e of effects ) {
      if ( (e.parent.system?.identified === false) && !game.user.isGM ) continue;
      if ( e.isAppliedEnchantment ) {
        if ( e.disabled ) categories.enchantmentInactive.effects.push(e);
        else categories.enchantmentActive.effects.push(e);
      }
      else if ( e.type === "enchantment" ) categories.enchantment.effects.push(e);
      else if ( e.isSuppressed ) categories.suppressed.effects.push(e);
      else if ( e.disabled ) categories.inactive.effects.push(e);
      else if ( e.isTemporary ) categories.temporary.effects.push(e);
      else categories.passive.effects.push(e);
    }
    categories.enchantment.hidden = !parent?.system.isEnchantment;
    categories.enchantmentActive.hidden = !categories.enchantmentActive.effects.length;
    categories.enchantmentInactive.hidden = !categories.enchantmentInactive.effects.length;
    categories.suppressed.hidden = !categories.suppressed.effects.length;

    for ( const category of Object.values(categories) ) {
      category.localizationPrefix = category.isEnchantment ? "DND5E.ENCHANTMENT.Action." : "DND5E.Effect";
    }

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
    const isConcentrationEffect = (this.document instanceof Actor5e) && this.app._concentration?.effects.has(effect);
    const options = [
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
        condition: () => effect.isOwner && !isConcentrationEffect,
        callback: li => this._onAction(li[0], "delete")
      },
      {
        name: effect.disabled ? "DND5E.ContextMenuActionEnable" : "DND5E.ContextMenuActionDisable",
        icon: effect.disabled ? "<i class='fas fa-check fa-fw'></i>" : "<i class='fas fa-times fa-fw'></i>",
        group: "state",
        condition: () => effect.isOwner && !isConcentrationEffect,
        callback: li => this._onAction(li[0], "toggle")
      },
      {
        name: "DND5E.ConcentrationBreak",
        icon: '<dnd5e-icon src="systems/dnd5e/icons/svg/break-concentration.svg"></dnd5e-icon>',
        condition: () => isConcentrationEffect,
        callback: () => this.document.endConcentration(effect),
        group: "state"
      }
    ];

    // Toggle Favorite State
    if ( (this.document instanceof Actor5e) && ("favorites" in this.document.system) ) {
      const uuid = effect.getRelativeUUID(this.document);
      const isFavorited = this.document.system.hasFavorite(uuid);
      options.push({
        name: isFavorited ? "DND5E.FavoriteRemove" : "DND5E.Favorite",
        icon: "<i class='fas fa-bookmark fa-fw'></i>",
        condition: () => effect.isOwner,
        callback: li => this._onAction(li[0], isFavorited ? "unfavorite" : "favorite"),
        group: "state"
      });
    }

    return options;
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

    if ( action === "toggleCondition" ) {
      return this._onToggleCondition(target.closest("[data-condition-id]")?.dataset.conditionId);
    }

    const dataset = target.closest("[data-effect-id]")?.dataset;
    const effect = this.getEffect(dataset);
    if ( (action !== "create") && !effect ) return;

    switch ( action ) {
      case "create":
        return this._onCreate(target);
      case "delete":
        await effect.deleteDialog({}, { render: false });
        return this.#app.render();
      case "duplicate":
        return effect.clone({name: game.i18n.format("DOCUMENT.CopyOf", {name: effect.name})}, {save: true});
      case "edit":
        return effect.sheet.render(true);
      case "favorite":
        return this.document.system.addFavorite({type: "effect", id: effect.getRelativeUUID(this.document)});
      case "toggle":
        return effect.update({disabled: !effect.disabled});
      case "unfavorite":
        return this.document.system.removeFavorite(effect.getRelativeUUID(this.document));
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling a condition.
   * @param {string} conditionId  The condition identifier.
   * @returns {Promise}
   * @protected
   */
  async _onToggleCondition(conditionId) {
    const existing = this.document.effects.get(staticID(`dnd5e${conditionId}`));
    if ( existing ) return existing.delete();
    const effect = await ActiveEffect.implementation.fromStatusEffect(conditionId);
    return ActiveEffect.implementation.create(effect, { parent: this.document, keepId: true });
  }

  /* -------------------------------------------- */

  /**
   * Create a new effect.
   * @param {HTMLElement} target  Button that triggered this action.
   * @returns {Promise<ActiveEffect5e>}
   */
  async _onCreate(target) {
    const li = target.closest("li");
    const isActor = this.document instanceof Actor;
    const isEnchantment = li.dataset.effectType.startsWith("enchantment");
    return this.document.createEmbeddedDocuments("ActiveEffect", [{
      type: isEnchantment ? "enchantment" : "base",
      name: isActor ? game.i18n.localize("DND5E.EffectNew") : this.document.name,
      icon: isActor ? "icons/svg/aura.svg" : this.document.img,
      origin: isEnchantment ? undefined : this.document.uuid,
      "duration.rounds": li.dataset.effectType === "temporary" ? 1 : undefined,
      disabled: ["inactive", "enchantmentInactive"].includes(li.dataset.effectType)
    }]);
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking an effect's source.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  async _onClickEffectSource(event) {
    const { uuid } = event.currentTarget.dataset;
    const doc = await fromUuid(uuid);
    if ( !doc ) return;
    if ( !doc.testUserPermission(game.user, "LIMITED") ) {
      ui.notifications.warn("DND5E.DocumentViewWarn", { localize: true });
      return;
    }
    doc.sheet.render(true);
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
