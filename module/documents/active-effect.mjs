/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 */
export default class ActiveEffect5e extends ActiveEffect {

  /**
   * Is this active effect currently suppressed?
   * @type {boolean}
   */
  isSuppressed = false;

  /* --------------------------------------------- */

  /** @inheritdoc */
  apply(actor, change) {
    if ( this.isSuppressed ) return null;
    if ( change.key.startsWith("flags.dnd5e.") ) change = this._prepareFlagChange(actor, change);
    return super.apply(actor, change);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _applyAdd(actor, change, current, delta, changes) {
    if ( current instanceof Set ) {
      if ( Array.isArray(delta) ) delta.forEach(item => current.add(item));
      else current.add(delta);
      return;
    }
    super._applyAdd(actor, change, current, delta, changes);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _applyOverride(actor, change, current, delta, changes) {
    if ( current instanceof Set ) {
      current.clear();
      if ( Array.isArray(delta) ) delta.forEach(item => current.add(item));
      else current.add(delta);
      return;
    }
    return super._applyOverride(actor, change, current, delta, changes);
  }

  /* --------------------------------------------- */

  /**
   * Transform the data type of the change to match the type expected for flags.
   * @param {Actor5e} actor            The Actor to whom this effect should be applied.
   * @param {EffectChangeData} change  The change being applied.
   * @returns {EffectChangeData}       The change with altered types if necessary.
   */
  _prepareFlagChange(actor, change) {
    const { key, value } = change;
    const data = CONFIG.DND5E.characterFlags[key.replace("flags.dnd5e.", "")];
    if ( !data ) return change;

    // Set flag to initial value if it isn't present
    const current = foundry.utils.getProperty(actor, key) ?? null;
    if ( current === null ) {
      let initialValue = null;
      if ( data.placeholder ) initialValue = data.placeholder;
      else if ( data.type === Boolean ) initialValue = false;
      else if ( data.type === Number ) initialValue = 0;
      foundry.utils.setProperty(actor, key, initialValue);
    }

    // Coerce change data into the correct type
    if ( data.type === Boolean ) {
      if ( value === "false" ) change.value = false;
      else change.value = Boolean(value);
    }
    return change;
  }

  /* --------------------------------------------- */

  /**
   * Determine whether this Active Effect is suppressed or not.
   */
  determineSuppression() {
    this.isSuppressed = false;
    if ( this.disabled || (this.parent.documentName !== "Actor") || !this.origin ) return;
    // Deliberately avoiding using fromUuidSync here, see: https://github.com/foundryvtt/dnd5e/pull/1980
    const parsed = foundry.utils.parseUuid(this.origin);
    if ( !parsed ) return;
    const { collection, documentId: parentId, embedded } = parsed;
    let item;
    // Case 1: This is a linked or sidebar actor
    if ( collection === game.actors ) {
      const [documentType, documentId] = embedded;
      if ( (parentId !== this.parent.id) || (documentType !== "Item") ) return;
      item = this.parent.items.get(documentId);
    }
    // Case 2: This is a synthetic actor on the scene
    else if ( collection === game.scenes ) {
      if ( embedded.length > 4 ) embedded.splice(2, 2);
      const [, documentId, syntheticItem, syntheticItemId] = embedded;
      if ( (documentId !== this.parent.token?.id) || (syntheticItem !== "Item") ) return;
      item = this.parent.items.get(syntheticItemId);
    }
    if ( !item ) return;
    this.isSuppressed = item.areEffectsSuppressed;
  }

  /* --------------------------------------------- */

  /**
   * Manage Active Effect instances through the Actor Sheet via effect control buttons.
   * @param {MouseEvent} event      The left-click event on the effect control
   * @param {Actor5e|Item5e} owner  The owning document which manages this effect
   * @returns {Promise|null}        Promise that resolves when the changes are complete.
   */
  static onManageActiveEffect(event, owner) {
    event.preventDefault();
    const a = event.currentTarget;
    const li = a.closest("li");
    const effect = li.dataset.effectId ? owner.effects.get(li.dataset.effectId) : null;
    switch ( a.dataset.action ) {
      case "create":
        const isActor = owner instanceof Actor;
        return owner.createEmbeddedDocuments("ActiveEffect", [{
          label: isActor ? game.i18n.localize("DND5E.EffectNew") : owner.name,
          icon: isActor ? "icons/svg/aura.svg" : owner.img,
          origin: owner.uuid,
          "duration.rounds": li.dataset.effectType === "temporary" ? 1 : undefined,
          disabled: li.dataset.effectType === "inactive"
        }]);
      case "edit":
        return effect.sheet.render(true);
      case "delete":
        return effect.deleteDialog();
      case "toggle":
        return effect.update({disabled: !effect.disabled});
    }
  }

  /* --------------------------------------------- */

  /**
   * Prepare the data structure for Active Effects which are currently applied to an Actor or Item.
   * @param {ActiveEffect5e[]} effects  The array of Active Effect instances to prepare sheet data for
   * @returns {object}                  Data for rendering
   */
  static prepareActiveEffectCategories(effects) {
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
    for ( let e of effects ) {
      if ( e.isSuppressed ) categories.suppressed.effects.push(e);
      else if ( e.disabled ) categories.inactive.effects.push(e);
      else if ( e.isTemporary ) categories.temporary.effects.push(e);
      else categories.passive.effects.push(e);
    }
    categories.suppressed.hidden = !categories.suppressed.effects.length;
    return categories;
  }
}
