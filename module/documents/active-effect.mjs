import FormulaField from "../data/fields/formula-field.mjs";
import MappingField from "../data/fields/mapping-field.mjs";
import { parseOrString, staticID } from "../utils.mjs";
import Item5e from "./item.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;
const { ObjectField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 */
export default class ActiveEffect5e extends ActiveEffect {
  /**
   * Static ActiveEffect ID for various conditions.
   * @type {Record<string, string>}
   */
  static ID = {
    BLOODIED: staticID("dnd5ebloodied"),
    ENCUMBERED: staticID("dnd5eencumbered"),
    EXHAUSTION: staticID("dnd5eexhaustion")
  };

  /* -------------------------------------------- */

  /**
   * Additional key paths to properties added during base data preparation that should be treated as formula fields.
   * @type {Set<string>}
   */
  static FORMULA_FIELDS = new Set([
    "system.attributes.ac.bonus",
    "system.attributes.ac.min",
    "system.attributes.encumbrance.bonuses.encumbered",
    "system.attributes.encumbrance.bonuses.heavilyEncumbered",
    "system.attributes.encumbrance.bonuses.maximum",
    "system.attributes.encumbrance.bonuses.overall",
    "system.attributes.encumbrance.multipliers.encumbered",
    "system.attributes.encumbrance.multipliers.heavilyEncumbered",
    "system.attributes.encumbrance.multipliers.maximum",
    "system.attributes.encumbrance.multipliers.overall",
    "save.dc.bonus"
  ]);

  /* -------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.ACTIVEEFFECT"];

  /* -------------------------------------------- */

  /**
   * Is this effect an enchantment on an item that accepts enchantment?
   * @type {boolean}
   */
  get isAppliedEnchantment() {
    return (this.type === "enchantment") && !!this.origin && (this.origin !== this.parent.uuid);
  }

  /* -------------------------------------------- */

  /**
   * Should this status effect be hidden from the current user?
   * @type {boolean}
   */
  get isConcealed() {
    if ( this.target?.testUserPermission(game.user, "OBSERVER") ) return false;

    // Hide bloodied status effect from players unless the token is friendly
    if ( (this.id === this.constructor.ID.BLOODIED) && (game.settings.get("dnd5e", "bloodied") === "player") ) {
      return this.target?.token?.disposition !== foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    }

    return false;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get isSuppressed() {
    if ( super.isSuppressed ) return true;
    if ( this.type === "enchantment" ) return false;
    if ( this.parent instanceof dnd5e.documents.Item5e ) return this.parent.areEffectsSuppressed;
    return false;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get isTemporary() {
    return super.isTemporary && !this.isConcealed;
  }

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

  /** @inheritDoc */
  static async _fromStatusEffect(statusId, { reference, ...effectData }, options) {
    if ( !("description" in effectData) && reference ) effectData.description = `@Embed[${reference} inline]`;
    return super._fromStatusEffect?.(statusId, effectData, options) ?? new this(effectData, options);
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeSource(data, options={}) {
    if ( data instanceof foundry.abstract.DataModel ) data = data.toObject();

    if ( data.flags?.dnd5e?.type === "enchantment" ) {
      data.type = "enchantment";
      delete data.flags.dnd5e.type;
      foundry.utils.setProperty(data, "flags.dnd5e.persistSourceMigration", true);
    }

    return super._initializeSource(data, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(data) {
    data = super.migrateData(data);
    for ( const change of data.changes ?? [] ) {
      if ( change.key === "flags.dnd5e.initiativeAdv" ) {
        change.key = "system.attributes.init.roll.mode";
        change.mode = CONST.ACTIVE_EFFECT_MODES.ADD;
        change.value = 1;
      }
    }
    return data;
  }

  /* -------------------------------------------- */
  /*  Effect Application                          */
  /* -------------------------------------------- */

  /** @inheritDoc */
  apply(doc, change) {
    // Ensure changes targeting flags use the proper types
    if ( change.key.startsWith("flags.dnd5e.") ) change = this._prepareFlagChange(doc, change);

    // Properly handle formulas that don't exist as part of the data model
    if ( ActiveEffect5e.FORMULA_FIELDS.has(change.key) ) {
      const field = new FormulaField({ deterministic: true });
      return { [change.key]: this.constructor.applyField(doc, change, field) };
    }

    // Handle activity-targeted changes
    if ( (change.key.startsWith("activities[") || change.key.startsWith("system.activities."))
      && (doc instanceof Item) ) return this.applyActivity(doc, change);

    return super.apply(doc, change);
  }

  /* -------------------------------------------- */

  /**
   * Apply a change to activities on this item.
   * @param {Item5e} item              The Item to whom this change should be applied.
   * @param {EffectChangeData} change  The change data being applied.
   * @returns {Record<string, *>}      An object of property paths and their updated values.
   */
  applyActivity(item, change) {
    const changes = {};
    const apply = (activity, key) => {
      const c = this.apply(activity, { ...change, key });
      Object.entries(c).forEach(([k, v]) => changes[`system.activities.${activity.id}.${k}`] = v);
    };
    if ( change.key.startsWith("system.activities.") ) {
      const [, , id, ...keyPath] = change.key.split(".");
      const activity = item.system.activities?.get(id);
      if ( activity ) apply(activity, keyPath.join("."));
    } else {
      const { type, key } = change.key.match(/activities\[(?<type>[^\]]+)]\.(?<key>.+)/)?.groups ?? {};
      item.system.activities?.getByType(type)?.forEach(activity => apply(activity, key));
    }
    return changes;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static applyField(model, change, field) {
    field ??= model.schema.getField(change.key);
    change = foundry.utils.deepClone(change);
    const current = foundry.utils.getProperty(model, change.key);
    const modes = CONST.ACTIVE_EFFECT_MODES;

    // Replace value when using string interpolation syntax
    if ( (field instanceof StringField) && (change.mode === modes.OVERRIDE) && change.value.includes("{}") ) {
      change.value = change.value.replace("{}", current ?? "");
    }

    // If current value is `null`, UPGRADE & DOWNGRADE should always just set the value
    if ( (current === null) && [modes.UPGRADE, modes.DOWNGRADE].includes(change.mode) ) change.mode = modes.OVERRIDE;

    // Handle removing entries from sets
    if ( (field instanceof SetField) && (change.mode === modes.ADD) && (foundry.utils.getType(current) === "Set") ) {
      for ( const value of field._castChangeDelta(change.value) ) {
        const neg = value.replace(/^\s*-\s*/, "");
        if ( neg !== value ) current.delete(neg);
        else current.add(value);
      }
      return current;
    }

    // If attempting to apply active effect to empty MappingField entry, create it
    if ( (current === undefined) && change.key.startsWith("system.") ) {
      let keyPath = change.key;
      let mappingField = field;
      while ( !(mappingField instanceof MappingField) && mappingField ) {
        if ( mappingField.name ) keyPath = keyPath.substring(0, keyPath.length - mappingField.name.length - 1);
        mappingField = mappingField.parent;
      }
      if ( mappingField && (foundry.utils.getProperty(model, keyPath) === undefined) ) {
        const created = mappingField.model.initialize(mappingField.model.getInitialValue(), mappingField);
        foundry.utils.setProperty(model, keyPath, created);
      }
    }

    // Parse any JSON provided when targeting an object
    if ( (field instanceof ObjectField) || (field instanceof SchemaField) ) {
      change = { ...change, value: parseOrString(change.value) };
    }

    return super.applyField(model, change, field);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _applyAdd(actor, change, current, delta, changes) {
    if ( current instanceof Set ) {
      const handle = v => {
        const neg = v.replace(/^\s*-\s*/, "");
        if ( neg !== v ) current.delete(neg);
        else current.add(v);
      };
      if ( Array.isArray(delta) ) delta.forEach(item => handle(item));
      else handle(delta);
      return;
    }
    super._applyAdd(actor, change, current, delta, changes);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _applyLegacy(actor, change, changes) {
    if ( this.system._applyLegacy?.(actor, change, changes) === false ) return;
    super._applyLegacy(actor, change, changes);
  }

  /* --------------------------------------------- */

  /** @inheritDoc */
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
   * @deprecated
   * @ignore
   */
  determineSuppression() {
    foundry.utils.logCompatibilityWarning(
      "The `ActiveEffect5e#determineSuppression` method has been deprecated and is no longer necessary to call.",
      { since: "DnD5e 5.1", until: "DnD5e 5.3" }
    );
  }
  /* -------------------------------------------- */
  /*  Lifecycle                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    if ( this.id === this.constructor.ID.EXHAUSTION ) this._prepareExhaustionLevel();
    if ( this.isAppliedEnchantment && this.uuid ) dnd5e.registry.enchantments.track(this.origin, this.uuid);
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
    this.img = this.constructor._getExhaustionImage(level);
    this.name = `${game.i18n.localize("DND5E.Exhaustion")} ${level}`;
    if ( level >= config.levels ) {
      this.statuses.add("dead");
      CONFIG.DND5E.statusEffects.dead.statuses?.forEach(s => this.statuses.add(s));
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

  /**
   * Create conditions that are applied separately from an effect.
   * @returns {Promise<ActiveEffect5e[]>}      Created rider effects.
   */
  async createRiderConditions() {
    const riders = new Set();

    for ( const status of this.getFlag("dnd5e", "riders.statuses") ?? [] ) {
      riders.add(status);
    }

    for ( const status of this.statuses ) {
      const r = CONFIG.statusEffects.find(e => e.id === status)?.riders ?? [];
      for ( const p of r ) riders.add(p);
    }

    if ( !riders.size ) return [];

    const createRider = async id => {
      const existing = this.parent.effects.get(staticID(`dnd5e${id}`));
      if ( existing ) return;
      const effect = await ActiveEffect5e.fromStatusEffect(id);
      return effect.toObject();
    };

    const effectData = await Promise.all(Array.from(riders).map(createRider));
    return ActiveEffect5e.createDocuments(effectData.filter(_ => _), { keepId: true, parent: this.parent });
  }

  /* -------------------------------------------- */

  /**
   * Create additional activities, effects, and items that are applied separately from an enchantment.
   * @param {object} options  Options passed to the effect creation.
   */
  async createRiderEnchantments(options={}) {
    let item;
    let profile;
    const { chatMessageOrigin } = options;
    const { enchantmentProfile, activityId } = options.dnd5e ?? {};

    if ( chatMessageOrigin ) {
      const message = game.messages.get(options?.chatMessageOrigin);
      item = message?.getAssociatedItem();
      const activity = message?.getAssociatedActivity();
      profile = activity?.effects.find(e => e._id === message?.getFlag("dnd5e", "use.enchantmentProfile"));
    } else if ( enchantmentProfile && activityId ) {
      let activity;
      const origin = await fromUuid(this.origin);
      if ( origin instanceof dnd5e.documents.activity.EnchantActivity ) {
        activity = origin;
        item = activity.item;
      } else if ( origin instanceof Item ) {
        item = origin;
        activity = item.system.activities?.get(activityId);
      }
      profile = activity?.effects.find(e => e._id === enchantmentProfile);
    }

    if ( !profile || !item ) return;

    // Create Activities
    const riderActivities = {};
    let riderEffects = [];
    for ( const id of profile.riders.activity ) {
      const activityData = item.system.activities.get(id)?.toObject();
      if ( !activityData ) continue;
      activityData._id = foundry.utils.randomID();
      riderActivities[activityData._id] = activityData;
    }
    let createdActivities = [];
    if ( !foundry.utils.isEmpty(riderActivities) ) {
      await this.parent.update({ "system.activities": riderActivities });
      createdActivities = Object.keys(riderActivities).map(id => this.parent.system.activities?.get(id));
      createdActivities.forEach(a => a.effects?.forEach(e => {
        if ( !this.parent.effects.has(e._id) ) riderEffects.push(item.effects.get(e._id)?.toObject());
      }));
    }

    // Create Effects
    riderEffects.push(...profile.riders.effect.map(id => {
      const effectData = item.effects.get(id)?.toObject();
      if ( effectData ) {
        delete effectData._id;
        delete effectData.flags?.dnd5e?.rider;
        effectData.origin = this.origin;
      }
      return effectData;
    }));
    riderEffects = riderEffects.filter(_ => _);
    const createdEffects = await this.parent.createEmbeddedDocuments("ActiveEffect", riderEffects, { keepId: true });

    // Create Items
    let createdItems = [];
    if ( this.parent.isEmbedded ) {
      const riderItems = await Item5e.createWithContents(
        (await Promise.all(profile.riders.item.map(uuid => fromUuid(uuid)))).filter(_ => _), {
          transformAll: item => item.clone({ "flags.dnd5e.enchantment.origin": this.uuid }, { keepId: true })
        }
      );
      createdItems = await this.parent.actor.createEmbeddedDocuments("Item", riderItems, { keepId: true });
    }

    if ( createdActivities.length || createdEffects.length || createdItems.length ) {
      this.addDependent(...createdActivities, ...createdEffects, ...createdItems);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  toDragData() {
    const data = super.toDragData();
    const activity = this.parent?.system.activities?.getByType("enchant").find(a => {
      return a.effects.some(e => e._id === this.id);
    });
    if ( activity ) data.activityId = activity.id;
    return data;
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( await super._preCreate(data, options, user) === false ) return false;
    if ( options.keepOrigin === false ) this.updateSource({ origin: this.parent.uuid });

    // Enchantments cannot be added directly to actors
    if ( (this.type === "enchantment") && (this.parent instanceof Actor) ) {
      ui.notifications.error("DND5E.ENCHANTMENT.Warning.NotOnActor", { localize: true });
      return false;
    }

    if ( this.isAppliedEnchantment ) {
      const origin = await fromUuid(this.origin);
      const errors = origin?.canEnchant?.(this.parent);
      if ( errors?.length ) {
        errors.forEach(err => console.error(err));
        return false;
      }
      this.updateSource({ disabled: false });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if ( userId === game.userId ) {
      if ( this.active && (this.parent instanceof Actor) ) await this.createRiderConditions();
      if ( this.isAppliedEnchantment ) await this.createRiderEnchantments(options);
    }
    if ( options.chatMessageOrigin ) {
      document.body.querySelectorAll(`[data-message-id="${options.chatMessageOrigin}"] enchantment-application`)
        .forEach(element => element.buildItemList());
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

  /** @inheritDoc */
  async _preDelete(options, user) {
    const dependents = this.getDependents();
    if ( dependents.length && !game.users.activeGM ) {
      ui.notifications.warn("DND5E.ConcentrationBreakWarning", { localize: true });
      return false;
    }
    return super._preDelete(options, user);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if ( game.user === game.users.activeGM ) this.getDependents().forEach(e => e.delete());
    if ( this.isAppliedEnchantment ) dnd5e.registry.enchantments.untrack(this.origin, this.uuid);
    document.body.querySelectorAll(`enchantment-application:has([data-enchantment-uuid="${this.uuid}"]`)
      .forEach(element => element.buildItemList());
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _displayScrollingStatus(enabled) {
    if ( this.isConcealed ) return;
    super._displayScrollingStatus(enabled);
  }

  /* -------------------------------------------- */
  /*  Exhaustion and Concentration Handling       */
  /* -------------------------------------------- */

  /**
   * Create effect data for concentration on an actor.
   * @param {Activity} activity  The Activity on which to begin concentrating.
   * @param {object} [data]      Additional data provided for the effect instance.
   * @returns {object}           Created data for the ActiveEffect.
   */
  static createConcentrationEffectData(activity, data={}) {
    const item = activity?.item;
    if ( !item?.isEmbedded || !activity.duration.concentration ) {
      throw new Error("You may not begin concentrating on this item!");
    }

    const statusEffect = CONFIG.statusEffects.find(e => e.id === CONFIG.specialStatusEffects.CONCENTRATING);
    const effectData = foundry.utils.mergeObject({
      ...statusEffect,
      name: `${game.i18n.localize("EFFECT.DND5E.StatusConcentrating")}: ${item.name}`,
      description: `<p>${game.i18n.format("DND5E.ConcentratingOn", {
        name: item.name,
        type: game.i18n.localize(`TYPES.Item.${item.type}`)
      })}</p><hr><p>@Embed[${item.uuid} inline]</p>`,
      duration: activity.duration.getEffectData(),
      "flags.dnd5e": {
        activity: {
          type: activity.type, id: activity.id, uuid: activity.uuid
        },
        item: {
          type: item.type, id: item.id, uuid: item.uuid,
          data: !item.actor.items.has(item.id) ? item.toObject() : undefined
        }
      },
      origin: item.uuid,
      statuses: [statusEffect.id].concat(statusEffect.statuses ?? [])
    }, data, {inplace: false});
    delete effectData.id;
    if ( item.type === "spell" ) effectData["flags.dnd5e.spellLevel"] = item.system.level;

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
   * Add modifications to the core ActiveEffect config.
   * @param {ActiveEffectConfig} app           The ActiveEffect config.
   * @param {HTMLElement} html                 The ActiveEffect config element.
   * @param {ApplicationRenderContext} context The app's rendering context.
   */
  static onRenderActiveEffectConfig(app, html, context) {
    const element = new foundry.data.fields.SetField(new foundry.data.fields.StringField(), {}).toFormGroup({
      label: game.i18n.localize("DND5E.CONDITIONS.RiderConditions.label"),
      hint: game.i18n.localize("DND5E.CONDITIONS.RiderConditions.hint")
    }, {
      name: "flags.dnd5e.riders.statuses",
      value: app.document.getFlag("dnd5e", "riders.statuses") ?? [],
      options: CONFIG.statusEffects.map(se => ({ value: se.id, label: se.name })),
      disabled: !context.editable
    });
    html.querySelector("[data-tab=details] > .form-group:has([name=statuses])")?.after(element);

    // Add tooltip with link to wiki for effects/enchantments
    const helpIconElement = document.createElement("i");
    helpIconElement.classList.add("fa-solid", "fa-circle-question");
    const tooltipText = game.i18n.format("DND5E.ACTIVEEFFECT.AttributeKeyTooltip", {
      url: app.document.type === "enchantment"
        ? "https://github.com/foundryvtt/dnd5e/wiki/Enchantment"
        : "https://github.com/foundryvtt/dnd5e/wiki/Active-Effect-Guide"
    });
    Object.assign(helpIconElement.dataset, { tooltip: tooltipText, tooltipDirection: "RIGHT", locked: "" });
    const targetElement = html.querySelector("section:is([data-tab='effects'], [data-tab='changes']) .key");
    if ( targetElement ) targetElement.insertAdjacentElement("beforeend", helpIconElement);
  }

  /* -------------------------------------------- */

  /**
   * Adjust exhaustion icon display to match current level.
   * @param {Application} app   The TokenHUD application.
   * @param {HTMLElement} html  The TokenHUD HTML.
   */
  static onTokenHUDRender(app, html) {
    const actor = app.object.actor;
    const level = foundry.utils.getProperty(actor, "system.attributes.exhaustion");
    if ( Number.isFinite(level) && (level > 0) ) {
      const img = ActiveEffect5e._getExhaustionImage(level);
      const elem = html.querySelector('[data-status-id="exhaustion"]');
      if ( elem ) {
        elem.style.objectPosition = "-100px";
        elem.style.background = `url('${img}') no-repeat center / contain`;
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the image used to represent exhaustion at this level.
   * @param {number} level
   * @returns {string}
   */
  static _getExhaustionImage(level) {
    // TODO: Only use `img` in 5.2.
    const { img, icon } = CONFIG.DND5E.conditionTypes.exhaustion;
    const split = img ? img.split(".") : icon.split(".");
    const ext = split.pop();
    const path = split.join(".");
    return `${path}-${level}.${ext}`;
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

    const id = target.dataset?.statusId;
    if ( id === "exhaustion" ) ActiveEffect5e._manageExhaustion(event, actor);
    else if ( id === "concentrating" ) ActiveEffect5e._manageConcentration(event, actor);
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
    actor.update({ "system.attributes.exhaustion": Math.clamp(level, 0, max) });
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
      const data = effect.getFlag("dnd5e", "item");
      acc[effect.id] = data?.name ?? actor.items.get(data?.id)?.name ?? game.i18n.localize("DND5E.ConcentratingItemless");
      return acc;
    }, {});
    const options = HandlebarsHelpers.selectOptions(choices, { hash: { sort: true } });
    const content = `
    <p>${game.i18n.localize("DND5E.ConcentratingEndChoice")}</p>
    <div class="form-group">
      <label>${game.i18n.localize("DND5E.SOURCE.FIELDS.source.label")}</label>
      <div class="form-fields">
        <select name="source">${options}</select>
      </div>
    </div>`;
    foundry.applications.api.Dialog.prompt({
      content,
      window: { title: game.i18n.localize("DND5E.Concentration") },
      ok: {
        label: game.i18n.localize("DND5E.Confirm"),
        callback: (event, button, dialog) => {
          const source = new foundry.applications.ux.FormDataExtended(button.form).object.source;
          if ( source ) actor.endConcentration(source);
        }
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Record another effect as a dependent of this one.
   * @param {...ActiveEffect5e} dependent  One or more dependent effects.
   * @returns {Promise<ActiveEffect5e>}
   */
  addDependent(...dependent) {
    const dependents = this.getFlag("dnd5e", "dependents") ?? [];
    dependents.push(...dependent.map(d => ({ uuid: d.uuid })));
    return this.setFlag("dnd5e", "dependents", dependents);
  }

  /* -------------------------------------------- */

  /**
   * Retrieve a list of dependent effects.
   * @returns {Array<ActiveEffect5e|Item5e>}
   */
  getDependents() {
    return (this.getFlag("dnd5e", "dependents") || []).reduce((arr, { uuid }) => {
      let effect;
      // TODO: Remove this special casing once https://github.com/foundryvtt/foundryvtt/issues/11214 is resolved
      if ( this.parent.pack && uuid.includes(this.parent.uuid) ) {
        const [, embeddedName, id] = uuid.replace(this.parent.uuid, "").split(".");
        effect = this.parent.getEmbeddedDocument(embeddedName, id);
      }
      else effect = fromUuidSync(uuid, { strict: false });
      if ( effect ) arr.push(effect);
      return arr;
    }, []);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Helper method to add choices that have been overridden by an active effect. Used to determine what fields might
   * need to be disabled because they are overridden by an active effect in a way not easily determined by looking at
   * the `Document#overrides` data structure.
   * @param {Actor5e|Item5e} doc  Document from which to determine the overrides.
   * @param {string} prefix       The initial form prefix under which the choices are grouped.
   * @param {string} path         Path in document data.
   * @param {string[]} overrides  The list of fields that are currently modified by Active Effects. *Will be mutated.*
   */
  static addOverriddenChoices(doc, prefix, path, overrides) {
    const source = new Set(foundry.utils.getProperty(doc._source, path) ?? []);
    const current = foundry.utils.getProperty(doc, path) ?? new Set();
    const delta = current.symmetricDifference(source);
    for ( const choice of delta ) overrides.push(`${prefix}.${choice}`);
  }

  /* -------------------------------------------- */

  /**
   * Render a rich tooltip for this effect.
   * @param {EnrichmentOptions} [enrichmentOptions={}]  Options for text enrichment.
   * @returns {Promise<{content: string, classes: string[]}>}
   */
  async richTooltip(enrichmentOptions={}) {
    const properties = [];
    if ( this.isSuppressed ) properties.push("DND5E.EffectType.Unavailable");
    else if ( this.disabled ) properties.push("DND5E.EffectType.Inactive");
    else if ( this.isTemporary ) properties.push("DND5E.EffectType.Temporary");
    else properties.push("DND5E.EffectType.Passive");
    if ( this.type === "enchantment" ) properties.push("DND5E.ENCHANTMENT.Label");

    return {
      content: await foundry.applications.handlebars.renderTemplate(
        "systems/dnd5e/templates/effects/parts/effect-tooltip.hbs", {
          effect: this,
          description: await TextEditor.enrichHTML(this.description ?? "", { relativeTo: this, ...enrichmentOptions }),
          durationParts: this.duration.remaining ? this.duration.label.split(", ") : [],
          properties: properties.map(p => game.i18n.localize(p))
        }
      ),
      classes: ["dnd5e2", "dnd5e-tooltip", "effect-tooltip", "themed", "theme-light"]
    };
  }

  /* -------------------------------------------- */

  /** @override */
  async deleteDialog(dialogOptions={}, operation={}) {
    const type = game.i18n.localize(this.constructor.metadata.label);
    return foundry.applications.api.DialogV2.confirm(foundry.utils.mergeObject({
      window: { title: `${game.i18n.format("DOCUMENT.Delete", { type })}: ${this.name}` },
      position: { width: 400 },
      content: `
        <p>
            <strong>${game.i18n.localize("AreYouSure")}</strong> ${game.i18n.format("SIDEBAR.DeleteWarning", { type })}
        </p>
      `,
      yes: { callback: () => this.delete(operation) }
    }, dialogOptions));
  }
}
