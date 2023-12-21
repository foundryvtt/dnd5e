import EffectsElement from "../applications/components/effects.mjs";

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
    if ( change.key.startsWith("flags.dnd5e.") ) change = this._prepareFlagChange(actor, change);

    // Determine type using DataField
    const field = change.key.startsWith("system.") ? actor.system.schema.getField(change.key.slice(7)) : null;

    // Get the current value of the target field
    const current = foundry.utils.getProperty(actor, change.key) ?? null;

    const getTargetType = field => {
      if ( field instanceof foundry.data.fields.ArrayField ) return "Array";
      else if ( field instanceof foundry.data.fields.ObjectField ) return "Object";
      else if ( field instanceof foundry.data.fields.BooleanField ) return "boolean";
      else if ( field instanceof foundry.data.fields.NumberField ) return "number";
      else if ( field instanceof foundry.data.fields.StringField ) return "string";
    };
    // TODO: Custom handling for FormulaField

    const targetType = getTargetType(field);
    if ( !targetType ) return super.apply(actor, change);

    let delta;
    try {
      if ( targetType === "Array" ) {
        const innerType = getTargetType(field.element);
        delta = this._castArray(change.value, innerType);
      }
      else delta = this._castDelta(change.value, targetType);
    } catch(err) {
      console.warn(`Actor [${actor.id}] | Unable to parse active effect change for ${change.key}: "${change.value}"`);
      return;
    }

    // Apply the change depending on the application mode
    const modes = CONST.ACTIVE_EFFECT_MODES;
    const changes = {};
    switch ( change.mode ) {
      case modes.ADD:
        this._applyAdd(actor, change, current, delta, changes);
        break;
      case modes.MULTIPLY:
        this._applyMultiply(actor, change, current, delta, changes);
        break;
      case modes.OVERRIDE:
        this._applyOverride(actor, change, current, delta, changes);
        break;
      case modes.UPGRADE:
      case modes.DOWNGRADE:
        this._applyUpgrade(actor, change, current, delta, changes);
        break;
      default:
        this._applyCustom(actor, change, current, delta, changes);
        break;
    }

    // Apply all changes to the Actor data
    foundry.utils.mergeObject(actor, changes);
    return changes;
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

  /** @inheritdoc */
  _applyUpgrade(actor, change, current, delta, changes) {
    if ( current === null ) return this._applyOverride(actor, change, current, delta, changes);
    return super._applyUpgrade(actor, change, current, delta, changes);
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
   * @deprecated since 3.0, targeted for removal in 3.2
   */
  static onManageActiveEffect(event, owner) {
    foundry.utils.logCompatibilityWarning(
      "ActiveEffects5e#onManageActiveEffect has been deprecated in favor of the new dnd5e-effects element.",
      { since: "DnD5e 3.0", until: "DnD5e 3.2" }
    );
    event.preventDefault();
    const a = event.currentTarget;
    const li = a.closest("li");
    if ( li.dataset.parentId ) owner = owner.items.get(li.dataset.parentId);
    const effect = li.dataset.effectId ? owner.effects.get(li.dataset.effectId) : null;
    switch ( a.dataset.action ) {
      case "create":
        const isActor = owner instanceof Actor;
        return owner.createEmbeddedDocuments("ActiveEffect", [{
          name: isActor ? game.i18n.localize("DND5E.EffectNew") : owner.name,
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
   * @deprecated since 3.0, targeted for removal in 3.2
   */
  static prepareActiveEffectCategories(effects) {
    foundry.utils.logCompatibilityWarning(
      "ActiveEffects5e#prepareActiveEffectCategories has been deprecated in favor of EffectsElement#prepareCategories.",
      { since: "DnD5e 3.0", until: "DnD5e 3.2" }
    );
    return EffectsElement.prepareCategories(effects);
  }
}
