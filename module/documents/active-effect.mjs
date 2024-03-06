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
   * Additional key paths to properties added during base data preparation that should be treated as formula fields.
   * @type {Set<string>}
   */
  static FORMULA_FIELDS = new Set(["system.attributes.ac.bonus"]);

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
    let field = change.key.startsWith("system.") ? actor.system.schema.getField(change.key.slice(7)) : null;

    // Get the current value of the target field
    const current = foundry.utils.getProperty(actor, change.key) ?? null;

    const getTargetType = field => {
      if ( (field instanceof FormulaField) || ActiveEffect5e.FORMULA_FIELDS.has(change.key) ) return "formula";
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
      if ( !field ) field = new FormulaField({ deterministic: true });
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
    if ( level >= config.levels ) {
      this.statuses.add("dead");
      CONFIG.DND5E.statusEffects.dead.statuses?.forEach(s => this.statuses.add(s));
    }
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
  /*  Exhaustion and Concentration Handling       */
  /* -------------------------------------------- */

  /**
   * Create effect data for concentration on an actor.
   * @param {Item5e} item       The item on which to begin concentrating.
   * @param {object} [data]     Additional data provided for the effect instance.
   * @returns {object}          Created data for the ActiveEffect.
   */
  static createConcentrationEffectData(item, data={}) {
    if ( !item.isEmbedded || !item.requiresConcentration ) {
      throw new Error("You may not begin concentrating on this item!");
    }

    const statusEffect = CONFIG.statusEffects.find(e => e.id === CONFIG.specialStatusEffects.CONCENTRATING);
    const effectData = foundry.utils.mergeObject({
      ...statusEffect,
      name: `${game.i18n.localize("EFFECT.DND5E.StatusConcentrating")}: ${item.name}`,
      description: game.i18n.format("DND5E.ConcentratingOn", {
        name: item.name,
        type: game.i18n.localize(`TYPES.Item.${item.type}`)
      }),
      duration: ActiveEffect5e.getEffectDurationFromItem(item),
      "flags.dnd5e.itemData": item.actor.items.has(item.id) ? item.id : item.toObject(),
      origin: item.uuid,
      statuses: [statusEffect.id].concat(statusEffect.statuses ?? [])
    }, data, {inplace: false});
    delete effectData.id;

    return effectData;
  }

  /* -------------------------------------------- */

  /**
   * Register listeners for custom handling in the TokenHUD.
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
      const img = ActiveEffect5e._getExhaustionImage(level);
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
   * Map the duration of an item to an active effect duration.
   * @param {Item5e} item     An item with a duration.
   * @returns {object}        The active effect duration.
   */
  static getEffectDurationFromItem(item) {
    const dur = item.system.duration ?? {};
    const value = dur.value || 1;

    switch ( dur.units ) {
      case "turn": return { turns: value };
      case "round": return { rounds: value };
      case "minute": return { seconds: value * 60 };
      case "hour": return { seconds: value * 60 * 60 };
      case "day": return { seconds: value * 60 * 60 * 24 };
      case "year": return { seconds: value * 60 * 60 * 24 * 365 };
      default: return {};
    }
  }

  /* -------------------------------------------- */

  /**
   * Implement custom behavior for select conditions on the token HUD.
   * @param {PointerEvent} event        The triggering event.
   */
  static onClickTokenHUD(event) {
    const { target } = event;
    if ( !target.classList?.contains("effect-control") ) return;

    const actor = canvas.hud.token.object?.actor;
    if ( !actor ) return;

    if ( target.dataset?.statusId === "exhaustion" ) ActiveEffect5e._manageExhaustion(event, actor);
    else if ( target.dataset?.statusId === "concentrating" ) ActiveEffect5e._manageConcentration(event, actor);
  }

  /* -------------------------------------------- */

  /**
   * Manage custom exhaustion cycling when interacting with the token HUD.
   * @param {PointerEvent} event        The triggering event.
   * @param {Actor5e} actor             The actor belonging to the token.
   */
  static _manageExhaustion(event, actor) {
    let level = foundry.utils.getProperty(actor, "system.attributes.exhaustion");
    if ( !Number.isFinite(level) ) return;
    event.preventDefault();
    event.stopPropagation();
    if ( event.button === 0 ) level++;
    else level--;
    const max = CONFIG.DND5E.conditionTypes.exhaustion.levels;
    actor.update({ "system.attributes.exhaustion": Math.clamped(level, 0, max) });
  }

  /* -------------------------------------------- */

  /**
   * Manage custom concentration handling when interacting with the token HUD.
   * @param {PointerEvent} event        The triggering event.
   * @param {Actor5e} actor             The actor belonging to the token.
   */
  static _manageConcentration(event, actor) {
    const { effects } = actor.concentration;
    if ( effects.size < 1 ) return;
    event.preventDefault();
    event.stopPropagation();
    if ( effects.size === 1 ) {
      actor.endConcentration(effects.first());
      return;
    }
    const choices = effects.reduce((acc, effect) => {
      const data = effect.getFlag("dnd5e", "itemData");
      acc[effect.id] = data?.name ?? actor.items.get(data)?.name ?? game.i18n.localize("DND5E.ConcentratingItemless");
      return acc;
    }, {});
    const options = HandlebarsHelpers.selectOptions(choices, { hash: { sort: true } });
    const content = `
    <form class="dnd5e">
      <p>${game.i18n.localize("DND5E.ConcentratingEndChoice")}</p>
      <div class="form-group">
        <label>${game.i18n.localize("DND5E.Source")}</label>
        <div class="form-fields">
          <select name="source">${options}</select>
        </div>
      </div>
    </form>`;
    Dialog.prompt({
      content: content,
      callback: ([html]) => {
        const source = new FormDataExtended(html.querySelector("FORM")).object.source;
        if ( source ) actor.endConcentration(source);
      },
      rejectClose: false,
      title: game.i18n.localize("DND5E.Concentration"),
      label: game.i18n.localize("DND5E.Confirm")
    });
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
