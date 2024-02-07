import EffectsElement from "../applications/components/effects.mjs";
import { FormulaField } from "../data/fields.mjs";
import { staticID } from "../utils.mjs";

/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 */
export default class ActiveEffect5e extends ActiveEffect {
  /**
   * Static ActiveEffect ID for various conditions.
   * @type {Record<string, string>}
   */
  static ID = {
    ENCUMBERED: staticID("dnd5eencumbered"),
    EXHAUSTION: staticID("dnd5eexhaustion")
  };

  /* -------------------------------------------- */

  /**
   * Is this active effect currently suppressed?
   * @type {boolean}
   */
  isSuppressed = false;

  /* -------------------------------------------- */

  /**
   * Retrieve the source Actor or Item, or null if it could not be determined.
   * @returns {Promise<Actor5e|Item5e|null>}
   */
  async getSource() {
    if ( (this.target instanceof dnd5e.documents.Actor5e) && (this.parent instanceof dnd5e.documents.Item5e) ) {
      return this.parent;
    }
    return fromUuid(this.origin);
  }

  /* -------------------------------------------- */

  /**
   * Create an ActiveEffect instance from some status effect data.
   * @param {string|object} effectData               The status effect ID or its data.
   * @param {DocumentModificationContext} [options]  Additional options to pass to ActiveEffect instantiation.
   * @returns {Promise<ActiveEffect5e|void>}
   */
  static async fromStatusEffect(effectData, options={}) {
    if ( typeof effectData === "string" ) effectData = CONFIG.statusEffects.find(e => e.id === effectData);
    if ( foundry.utils.getType(effectData) !== "Object" ) return;
    const createData = {
      ...foundry.utils.deepClone(effectData),
      _id: staticID(`dnd5e${effectData.id}`),
      name: game.i18n.localize(effectData.name),
      statuses: [effectData.id, ...effectData.statuses ?? []]
    };
    if ( !("description" in createData) && effectData.reference ) {
      const page = await fromUuid(effectData.reference);
      createData.description = page?.text.content ?? "";
    }
    this.migrateDataSafe(createData);
    this.cleanData(createData);
    return new this(createData, { keepId: true, ...options });
  }

  /* -------------------------------------------- */
  /*  Effect Application                          */
  /* -------------------------------------------- */

  /** @inheritdoc */
  apply(actor, change) {
    if ( change.key.startsWith("flags.dnd5e.") ) change = this._prepareFlagChange(actor, change);

    // Determine type using DataField
    const field = change.key.startsWith("system.") ? actor.system.schema.getField(change.key.slice(7)) : null;

    // Get the current value of the target field
    const current = foundry.utils.getProperty(actor, change.key) ?? null;

    const getTargetType = field => {
      if ( field instanceof FormulaField ) return "formula";
      else if ( field instanceof foundry.data.fields.ArrayField ) return "Array";
      else if ( field instanceof foundry.data.fields.ObjectField ) return "Object";
      else if ( field instanceof foundry.data.fields.BooleanField ) return "boolean";
      else if ( field instanceof foundry.data.fields.NumberField ) return "number";
      else if ( field instanceof foundry.data.fields.StringField ) return "string";
    };

    const targetType = getTargetType(field);
    if ( !targetType ) return super.apply(actor, change);

    // Special handling for FormulaField
    if ( targetType === "formula" ) {
      const changes = {};
      const delta = field._cast(change.value).trim();
      this._applyFormulaField(actor, change, current, delta, changes);
      foundry.utils.mergeObject(actor, changes);
      return changes;
    }

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

  /**
   * Custom application for FormulaFields.
   * @param {Actor5e} actor                 The Actor to whom this effect should be applied
   * @param {EffectChangeData} change       The change data being applied
   * @param {string} current                The current value being modified
   * @param {string} delta                  The parsed value of the change object
   * @param {object} changes                An object which accumulates changes to be applied
   */
  _applyFormulaField(actor, change, current, delta, changes) {
    if ( !current || change.mode === CONST.ACTIVE_EFFECT_MODES.OVERRIDE ) {
      this._applyOverride(actor, change, current, delta, changes);
      return;
    }
    const terms = (new Roll(current)).terms;
    let fn = "min";
    switch ( change.mode ) {
      case CONST.ACTIVE_EFFECT_MODES.ADD:
        const operator = delta.startsWith("-") ? "-" : "+";
        delta = delta.replace(/^[+-]?/, "").trim();
        changes[change.key] = `${current} ${operator} ${delta}`;
        break;
      case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
        if ( terms.length > 1 ) changes[change.key] = `(${current}) * ${delta}`;
        else changes[change.key] = `${current} * ${delta}`;
        break;
      case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
        fn = "max";
      case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
        if ( (terms.length === 1) && (terms[0].fn === fn) ) {
          changes[change.key] = current.replace(/\)$/, `, ${delta})`);
        } else changes[change.key] = `${fn}(${current}, ${delta})`;
        break;
      default:
        this._applyCustom(actor, change, current, delta, changes);
        break;
    }
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
    if ( this.parent instanceof dnd5e.documents.Item5e ) this.isSuppressed = this.parent.areEffectsSuppressed;
  }

  /* -------------------------------------------- */

  /** @override */
  getRelativeUUID(doc) {
    // Backport relative UUID fixes to accommodate descendant documents. Can be removed once v12 is the minimum.
    if ( this.compendium && (this.compendium !== doc.compendium) ) return this.uuid;
    if ( this.isEmbedded && (this.collection === doc.collection) ) return `.${this.id}`;
    const parts = [this.documentName, this.id];
    let parent = this.parent;
    while ( parent ) {
      if ( parent === doc ) break;
      parts.unshift(parent.documentName, parent.id);
      parent = parent.parent;
    }
    if ( parent === doc ) return `.${parts.join(".")}`;
    return this.uuid;
  }

  /* -------------------------------------------- */
  /*  Lifecycle                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    if ( this.id === this.constructor.ID.EXHAUSTION ) this._prepareExhaustionLevel();
  }

  /* -------------------------------------------- */

  /**
   * Modify the ActiveEffect's attributes based on the exhaustion level.
   * @protected
   */
  _prepareExhaustionLevel() {
    const config = CONFIG.DND5E.conditionTypes.exhaustion;
    let level = this.getFlag("dnd5e", "exhaustionLevel");
    if ( !Number.isFinite(level) ) level = 1;
    this.icon = this.constructor._getExhaustionImage(level);
    this.name = `${game.i18n.localize("DND5E.Exhaustion")} ${level}`;
    if ( level >= config.levels ) this.statuses.add("dead");
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    const originalLevel = foundry.utils.getProperty(options, "dnd5e.originalExhaustion");
    const newLevel = foundry.utils.getProperty(data, "flags.dnd5e.exhaustionLevel");
    const originalEncumbrance = foundry.utils.getProperty(options, "dnd5e.originalEncumbrance");
    const newEncumbrance = data.statuses?.[0];
    const name = this.name;

    // Display proper scrolling status effects for exhaustion
    if ( (this.id === this.constructor.ID.EXHAUSTION) && Number.isFinite(newLevel) && Number.isFinite(originalLevel) ) {
      if ( newLevel === originalLevel ) return;
      // Temporarily set the name for the benefit of _displayScrollingTextStatus. We should improve this method to
      // accept a name parameter instead.
      if ( newLevel < originalLevel ) this.name = `Exhaustion ${originalLevel}`;
      this._displayScrollingStatus(newLevel > originalLevel);
      this.name = name;
    }

    // Display proper scrolling status effects for encumbrance
    else if ( (this.id === this.constructor.ID.ENCUMBERED) && originalEncumbrance && newEncumbrance ) {
      if ( newEncumbrance === originalEncumbrance ) return;
      const increase = !originalEncumbrance || ((originalEncumbrance === "encumbered") && newEncumbrance)
        || (newEncumbrance === "exceedingCarryingCapacity");
      if ( !increase ) this.name = CONFIG.DND5E.encumbrance.effects[originalEncumbrance].name;
      this._displayScrollingStatus(increase);
      this.name = name;
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare effect favorite data.
   * @returns {Promise<FavoriteData5e>}
   */
  async getFavoriteData() {
    return {
      img: this.img,
      title: this.name,
      subtitle: this.duration.remaining ? this.duration.label : "",
      toggle: !this.disabled,
      suppressed: this.isSuppressed
    };
  }

  /* -------------------------------------------- */
  /*  Exhaustion Handling                         */
  /* -------------------------------------------- */

  /**
   * Register listeners for custom exhaustion handling in the TokenHUD.
   */
  static registerHUDListeners() {
    Hooks.on("renderTokenHUD", this.onTokenHUDRender);
    document.addEventListener("click", this.onClickTokenHUD.bind(this), { capture: true });
    document.addEventListener("contextmenu", this.onClickTokenHUD.bind(this), { capture: true });
  }

  /* -------------------------------------------- */

  /**
   * Adjust exhaustion icon display to match current level.
   * @param {Application} app  The TokenHUD application.
   * @param {jQuery} html      The TokenHUD HTML.
   */
  static onTokenHUDRender(app, html) {
    const actor = app.object.actor;
    const level = foundry.utils.getProperty(actor, "system.attributes.exhaustion");
    if ( Number.isFinite(level) && (level > 0) ) {
      const img = this._getExhaustionImage(level);
      html.find('[data-status-id="exhaustion"]').css({
        objectPosition: "-100px",
        background: `url('${img}') no-repeat center / contain`
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the image used to represent exhaustion at this level.
   * @param {number} level
   * @returns {string}
   */
  static _getExhaustionImage(level) {
    const split = CONFIG.DND5E.conditionTypes.exhaustion.icon.split(".");
    const ext = split.pop();
    const path = split.join(".");
    return `${path}-${level}.${ext}`;
  }

  /* -------------------------------------------- */

  /**
   * Implement custom exhaustion cycling when interacting with the Token HUD.
   * @param {PointerEvent} event        The triggering event.
   */
  static onClickTokenHUD(event) {
    const { target } = event;
    if ( !target.classList?.contains("effect-control") || (target.dataset?.statusId !== "exhaustion") ) return;
    const actor = canvas.hud.token.object?.actor;
    let level = foundry.utils.getProperty(actor ?? {}, "system.attributes.exhaustion");
    if ( !Number.isFinite(level) ) return;
    event.preventDefault();
    event.stopPropagation();
    if ( event.button === 0 ) level++;
    else level--;
    const max = CONFIG.DND5E.conditionTypes.exhaustion.levels;
    actor.update({ "system.attributes.exhaustion": Math.clamped(level, 0, max) });
  }

  /* -------------------------------------------- */
  /*  Deprecations                                */
  /* -------------------------------------------- */

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
