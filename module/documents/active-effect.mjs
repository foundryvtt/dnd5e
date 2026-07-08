import CreateDocumentDialog from "../applications/create-document-dialog.mjs";
import ConditionData from "../data/active-effect/condition.mjs";
import FormulaField from "../data/fields/formula-field.mjs";
import MappingField from "../data/fields/mapping-field.mjs";
import { parseOrString, staticID } from "../utils.mjs";
import Item5e from "./item.mjs";
import DependentDocumentMixin from "./mixins/dependent.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;
const { ObjectField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { FavoriteData5e } from "../data/abstract/_types.mjs";
 */

/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 */
export default class ActiveEffect5e extends DependentDocumentMixin(ActiveEffect) {

  /**
   * The default icon used for newly created Active Effect documents.
   * @type {string}
   */
  static DEFAULT_ICON = "systems/dnd5e/icons/svg/documents/active-effect.svg";

  /* -------------------------------------------- */

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
  static FORMULA_FIELDS = new class extends Set {
    add(value) {
      foundry.utils.logCompatibilityWarning(
        "`ActiveEffect5e#FOMRULA_FIELDS` has been deprecated in favor of non-persisted fields.",
        { since: "DnD5e 6.0", until: "DnD5e 6.2" }
      );
      super.add(value);
    }
  }();

  /* -------------------------------------------- */

  /**
   * Active effect fields that should be redirected to another field, optionally with a compatibility warning.
   * Optional warning object contains options passed to `foundry.utils.logCompatibilityWarning`.
   * @type {Record<string, { key: string, [type]: string, [value]: Function, [warning]: object }>}
   */
  static SHIM_FIELDS = {
    "system.attributes.movement.speed": { key: "system.attributes.movement.walk" },
    "system.attributes.senses.darkvision": { key: "system.attributes.senses.ranges.darkvision" },
    "system.attributes.senses.blindsight": { key: "system.attributes.senses.ranges.blindsight" },
    "system.attributes.senses.tremorsense": { key: "system.attributes.senses.ranges.tremorsense" },
    "system.attributes.senses.truesight": { key: "system.attributes.senses.ranges.truesight" }
  };

  /* -------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.ACTIVEEFFECT"];

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Document type to which this active effect should apply its changes.
   * @type {string}
   */
  get applicableType() {
    return this.system.applicableType ?? "Actor";
  }

  /* -------------------------------------------- */

  /**
   * Another effect that granted this effect as a rider.
   * @type {ActiveEffect5e|null}
   */
  get dependentOrigin() {
    if ( !(this.parent instanceof Item) ) return null;
    return this.item.effects.get(this.flags.dnd5e?.dependentOn) ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Is this effect an enchantment on an item that accepts enchantment?
   * @type {boolean}
   */
  get isAppliedEnchantment() {
    return (this.type === "enchantment") && this.system.isApplied;
  }

  /* -------------------------------------------- */

  /**
   * Should this status effect be hidden from the current user?
   * @type {boolean}
   */
  get isConcealed() {
    if ( this.system.isConcealed ) return true;
    if ( this.dependentOrigin?.active === false ) return true;
    if ( (this.item?.system?.identified === false) && !game.user.isGM ) return true;
    if ( this.target?.testUserPermission(game.user, "OBSERVER") ) return false;

    // Hide bloodied status effect from players unless the token is friendly
    if ( (this.id === this.constructor.ID.BLOODIED) && (dnd5e.settings.bloodied === "player") ) {
      return this.target?.token?.disposition !== foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    }

    return false;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get isSuppressed() {
    if ( super.isSuppressed ) return true;
    if ( this.system.magical && this.actor?.statuses.has("antimagic") ) return true;
    if ( this.type === "enchantment" ) return false;
    if ( this.type === "condition" ) return false;
    if ( this.item ) {
      if ( this.item.areEffectsSuppressed ) return true;
      if ( this.dependentOrigin?.active === false ) return true;
    }
    return false;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get isTemporary() {
    return !this.isConcealed && (super.isTemporary || !!this.getFlag("dnd5e", "isTemporary"));
  }

  /* -------------------------------------------- */

  /**
   * Retrieve the source Actor or Item, or null if it could not be determined.
   * @returns {Promise<Actor5e|Item5e|null>}
   */
  async getSource() {
    if ( (this.target instanceof dnd5e.documents.Actor5e) && (this.parent instanceof dnd5e.documents.Item5e) ) {
      return this.item;
    }
    return fromUuid(this.origin);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static async _fromStatusEffect(statusId, { reference, ...effectData }, options) {
    if ( !("description" in effectData) && reference ) effectData.description = `@Embed[${reference} inline]`;
    foundry.utils.mergeObject(effectData, { type: "condition", "system.type": statusId });
    return super._fromStatusEffect(statusId, effectData, options);
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

    else if ( (data.type !== "condition")
      && Object.values(CONFIG.statusEffects).some(e => e._id === data._id) ) {
      foundry.utils.mergeObject(data, {
        type: "condition",
        "system.type": data.statuses[0],
        "flags.dnd5e.persistSourceMigration": true
      });
    }

    return super._initializeSource(data, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    source = super.migrateData(source);

    for ( const change of source.changes ?? [] ) {
      if ( change.key === "flags.dnd5e.initiativeAdv" ) {
        change.key = "system.attributes.init.roll.mode";
        change.type = "add";
        change.value = 1;
      }
    }

    if ( source.flags?.dnd5e?.riders?.statuses && !source.system?.rider?.statuses ) {
      foundry.utils.setProperty(source, "system.rider.statuses", source.flags.dnd5e.riders.statuses);
      delete source.flags.dnd5e.riders.statuses;
    }

    return source;
  }

  /* -------------------------------------------- */
  /*  Effect Application                          */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static applyChange(model, change, options={}) {
    // Apply shims to moved fields
    change = change.effect._applyChangeShim(change);

    // Handle special actor flags
    if ( change.key.startsWith("flags.dnd5e.") ) change = change.effect._prepareFlagChange(model, change);

    // Properly handle formulas that don't exist as part of the data model
    if ( ActiveEffect5e.FORMULA_FIELDS.has(change.key) ) {
      const field = new FormulaField({ deterministic: change.key !== "system.damage.bonus" });
      return { [change.key]: this.applyChangeField(model, change, { field }) };
    }

    // Handle activity-targeted changes
    if ( (change.key.startsWith("activities[") || change.key.startsWith("system.activities."))
      && (model instanceof Item) ) return change.effect.applyActivity(model, change, options);

    // Handle hiding items
    if ( (change.key === "items.hidden") && (model instanceof Actor) ) {
      if ( change.type === "add" ) {
        if ( model.items.has(change.value) ) model.hiddenItems.add(change.value);
        else model.identifiedItems.get(change.value)?.forEach(i => model.hiddenItems.add(i.id));
      } else if ( change.type === "subtract" ) {
        if ( model.items.has(change.value) ) model.hiddenItems.delete(change.value);
        else model.identifiedItems.get(change.value)?.forEach(i => model.hiddenItems.delete(i.id));
      }
      return;
    }

    return super.applyChange(model, change, options);
  }

  /* -------------------------------------------- */

  /**
   * Apply a change to activities on this item.
   * @param {Item5e} item              The Item to whom this change should be applied.
   * @param {EffectChangeData} change  The change data being applied.
   * @param {object} [options]         Options passed through to `ActiveEffect#applyChange`.
   * @returns {Record<string, *>}      An object of property paths and their updated values.
   */
  applyActivity(item, change, options) {
    const changes = {};
    const apply = (activity, key) => {
      const c = this.constructor.applyChange(activity, { ...change, key }, options);
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
  static applyChangeField(model, change, options={}) {
    const current = foundry.utils.getProperty(model, change.key);
    const { field } = options;

    // Replace value when using string interpolation syntax
    if ( (field instanceof StringField) && (change.type === "override") && change.value?.includes?.("{}") ) {
      change.value = change.value.replace("{}", current ?? "");
    }

    // If current value is `null`, UPGRADE & DOWNGRADE should always just set the value
    if ( (current === null) && ["upgrade", "downgrade"].includes(change.type) ) change.type = "override";

    // Handle removing entries from sets
    if ( (field instanceof SetField) && (change.type === "add") && (foundry.utils.getType(current) === "Set") ) {
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

    return super.applyChangeField(model, change, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static _applyChangeAdd(actor, change, current, delta, changes) {
    if ( current instanceof Set ) {
      const handle = v => {
        const neg = v.replace(/^\s*-\s*/, "");
        if ( neg !== v ) current.delete(neg);
        else current.add(v);
      };
      if ( Array.isArray(delta) ) delta.forEach(item => handle(item));
      else if ( delta instanceof Set ) {
        for ( const item of delta ) handle(item);
      }
      else handle(delta);
      return;
    }
    super._applyChangeAdd(actor, change, current, delta, changes);
  }

  /* -------------------------------------------- */

  /**
   * Modify the provided change according to a shim an emit a warning if required.
   * @param {EffectChangeData} change  The change being applied.
   * @returns {EffectChangeData}
   * @protected
   */
  _applyChangeShim(change) {
    const shim = ActiveEffect5e.SHIM_FIELDS[change.key];
    if ( !shim ) return change;
    if ( shim.warning ) foundry.utils.logCompatibilityWarning(
      `The active effect key "${change.key}" has been deprecated and should be changed to "${shim.key}".`,
      shim.warning
    );
    return { ...change, key: shim.key, type: shim.type ?? change.type };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static _applyChangeUnguided(actor, change, changes, { replacementData }={}) {
    if ( change.effect.system._applyLegacy?.(actor, change, changes) === false ) return;

    // Double-check whether the target should be treated as a formula if the key has been modified
    if ( ActiveEffect5e.FORMULA_FIELDS.has(change.key) ) {
      const field = new FormulaField({ deterministic: change.key !== "system.damage.bonus" });
      return { [change.key]: this.applyChangeField(actor, change, { field }) };
    }

    super._applyChangeUnguided(actor, change, changes, { replacementData });
  }

  /* --------------------------------------------- */

  /** @inheritDoc */
  static _applyChangeUpgrade(actor, change, current, delta, changes) {
    if ( current === null ) return this._applyChangeOverride(actor, change, current, delta, changes);
    return super._applyChangeUpgrade(actor, change, current, delta, changes);
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

  /* -------------------------------------------- */
  /*  Lifecycle                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    this.origin = this.getFlag("core", "originText") ?? this.origin;
    super.prepareBaseData();
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
    const riders = new Set(this.system.rider?.statuses ?? []);

    for ( const status of this.statuses ) {
      const r = CONFIG.statusEffects[status]?.riders ?? [];
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
      const message = game.messages.get(chatMessageOrigin);
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
      foundry.utils.setProperty(activityData, "flags.dnd5e.dependentOn", this.id);
      riderActivities[activityData._id] = activityData;
    }
    if ( !foundry.utils.isEmpty(riderActivities) ) {
      await this.item.update({ "system.activities": riderActivities });
      const createdActivities = Object.keys(riderActivities).map(id => this.item.system.activities?.get(id));
      createdActivities.forEach(a => a.effects?.forEach(e => {
        if ( !this.item.effects.has(e._id) ) riderEffects.push(item.effects.get(e._id)?.toObject());
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
    riderEffects.forEach(e => foundry.utils.setProperty(e, "flags.dnd5e.dependentOn", this.id));
    await this.item.createEmbeddedDocuments("ActiveEffect", riderEffects, { keepId: true });

    // Create Items
    if ( this.item.isEmbedded ) {
      const riderItems = await Item5e.createWithContents(
        (await Promise.all(profile.riders.item.map(uuid => fromUuid(uuid)))).filter(_ => _), {
          transformAll: item => {
            const itemData = item.clone({}, { keepId: true }).toObject();
            foundry.utils.setProperty(itemData, "flags.dnd5e.dependentOn", this.uuid);
            foundry.utils.setProperty(itemData, "flags.dnd5e.enchantment.origin", this.uuid);
            return itemData;
          }
        }
      );
      await this.actor.createEmbeddedDocuments("Item", riderItems, { keepId: true });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  toDragData() {
    const data = super.toDragData();
    const activity = this.item?.system.activities?.getByType("enchant").find(a => {
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
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if ( userId === game.userId ) {
      if ( this.active && (this.parent instanceof Actor) ) await this.createRiderConditions();
      if ( this.isAppliedEnchantment ) await this.createRiderEnchantments(options);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static async _onCreateOperation(documents, operation, user) {
    await super._onCreateOperation(documents, operation, user);
    if ( user.id !== game.userId ) return;
    // Prompt to end concentration at most once per actor, even when several incapacitating effects are created in the
    // same operation.
    const prompted = new Set();
    for ( const effect of documents ) {
      if ( !effect._shouldPromptConcentrationEnd() ) continue;
      const actor = effect.parent;
      if ( prompted.has(actor) ) continue;
      prompted.add(actor);
      await actor.promptConcentrationEnd();
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    const originalEncumbrance = foundry.utils.getProperty(options, "dnd5e.originalEncumbrance");
    const newEncumbrance = data.statuses?.[0];
    const name = this.name;

    // Display proper scrolling status effects for encumbrance
    if ( (this.id === this.constructor.ID.ENCUMBERED) && originalEncumbrance && newEncumbrance ) {
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
      ui.notifications.warn("DND5E.CONCENTRATION.Warning.BreakWithoutGM");
      return false;
    }
    return super._preDelete(options, user);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if ( game.user === game.users.activeGM ) this.getDependents().forEach(e => e.delete());
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _displayScrollingStatus(enabled) {
    if ( this.isConcealed ) return;
    super._displayScrollingStatus(enabled);
  }

  /* -------------------------------------------- */
  /*  Concentration Handling                      */
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

    const statusEffect = CONFIG.statusEffects[CONFIG.specialStatusEffects.CONCENTRATING];
    const effectData = foundry.utils.mergeObject({
      ...statusEffect,
      name: `${_loc("EFFECT.DND5E.StatusConcentrating")}: ${item.name}`,
      description: `<p>${_loc("DND5E.CONCENTRATION.Description", {
        name: item.name,
        type: _loc(`TYPES.Item.${item.type}`)
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
      statuses: [statusEffect.id].concat(statusEffect.statuses ?? []),
      system: {
        type: "concentrating"
      }
    }, data, {inplace: false});
    delete effectData.id;
    if ( item.type === "spell" ) effectData["flags.dnd5e.spellLevel"] = item.system.level;

    return effectData;
  }

  /* -------------------------------------------- */

  /**
   * Determine whether this effect applies a status that should prompt concentration to end.
   * @returns {boolean}
   * @protected
   */
  _shouldPromptConcentrationEnd() {
    if ( !this.active || !(this.parent instanceof Actor) ) return false;
    if ( dnd5e.settings.disableConcentration || !this.actor.concentration.effects.size ) return false;

    return this.statuses.has("dead") || this.statuses.has("incapacitated");
  }

  /* -------------------------------------------- */

  /**
   * Add modifications to the core ActiveEffect config.
   * @param {ActiveEffectConfig} app           The ActiveEffect config.
   * @param {HTMLElement} html                 The ActiveEffect config element.
   * @param {ApplicationRenderContext} context The app's rendering context.
   */
  static onRenderActiveEffectConfig(app, html, context) {
    app.document.system.onRenderActiveEffectConfig?.(app, html, context);
  }

  /* -------------------------------------------- */

  /**
   * Manage custom concentration handling when interacting with the token HUD.
   * @param {PointerEvent} event        The triggering event.
   * @param {Actor5e} actor             The actor belonging to the token.
   * @returns {boolean}                 Whether the status was resolved via this method.
   */
  static _manageConcentration(event, actor) {
    const { effects } = actor.concentration;
    if ( effects.size < 1 ) return false;
    event.preventDefault();
    event.stopPropagation();
    if ( effects.size === 1 ) actor.endConcentration(effects.first());
    else ActiveEffect5e.endConcentrationDialog(actor, effects);
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Manage custom condition handling when interacting with the token HUD.
   * @param {PointerEvent} event        The triggering event.
   * @param {Actor5e} actor             The actor belonging to the token.
   * @param {string} status             The status condition.
   * @returns {boolean}                 Whether the status was resolved via this method.
   */
  static _manageCondition(event, actor, status) {
    if ( ConditionData.hasLevels(status) ) return false;
    const effects = new Set(actor.effects.filter(effect => effect.statuses.has(status)));
    if ( !effects.size ) return false;
    event.preventDefault();
    event.stopPropagation();
    if ( effects.size > 1 ) ActiveEffect5e.deleteConditionDialog(actor, effects);
    else effects.first().delete();
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Prompt the user to delete one of several conditions.
   * @param {Actor5e} actor                           The owner of the effects.
   * @param {string|Set<ActiveEffect5e>} effects      A set of effects, or the status to derive them from.
   * @returns {Promise<ActiveEffect5e[]|null>}
   */
  static async deleteConditionDialog(actor, effects) {
    if ( foundry.utils.getType(effects) === "string" ) {
      effects = new Set(actor.effects.filter(effect => effect.statuses.has(effects)));
    }
    if ( !effects.size ) return null;
    const choices = Object.fromEntries(Array.from(effects).map(effect => [effect.id, effect.name]));
    const source = await ActiveEffect5e.#promptRemoveSource({
      choices, hint: "DND5E.EFFECT.Status.DeleteDialog.hint", title: "DND5E.EFFECT.Status.DeleteDialog.title"
    });
    if ( source === null ) return null;
    return actor.deleteEmbeddedDocuments("ActiveEffect", source ? [source] : Object.keys(choices));
  }

  /* -------------------------------------------- */

  /**
   * Prompt the user to end concentration on one source, or all of them.
   * @param {Actor5e} actor                       The concentrating actor.
   * @param {Collection<ActiveEffect5e>} effects  The active concentration effects.
   * @returns {Promise<ActiveEffect5e[]|null>}    The effects concentration was ended on, or null if dismissed.
   */
  static async endConcentrationDialog(actor, effects) {
    const choices = effects.reduce((acc, effect) => {
      const data = effect.getFlag("dnd5e", "item");
      acc[effect.id] = data?.name ?? actor.items.get(data?.id)?.name ?? _loc("DND5E.CONCENTRATION.NoSource");
      return acc;
    }, {});
    const source = await ActiveEffect5e.#promptRemoveSource({
      choices, hint: "DND5E.CONCENTRATION.EndChoice", title: "DND5E.Concentration"
    });
    if ( source === null ) return null;
    return actor.endConcentration(source || undefined);
  }

  /* -------------------------------------------- */

  /**
   * Prompt the user to pick one of several sources of an effect, or all of them.
   * @param {object} config
   * @param {Record<string, string>} config.choices  Mapping of option value to display label.
   * @param {string} config.hint                     Localization key for the hint describing the choice.
   * @param {string} config.title                    Localization key for the dialog title.
   * @returns {Promise<string|null>}                 The selected value ("" for all sources), or null if dismissed.
   */
  static #promptRemoveSource({ choices, hint, title }) {
    const sources = Object.entries(choices).sort((a, b) => a[1].localeCompare(b[1], game.i18n.lang));
    const group = foundry.applications.fields.createFormGroup({
      label: _loc("DND5E.EFFECT.Action.RemoveStatus.label"),
      hint: _loc(hint),
      input: foundry.applications.fields.createSelectInput({
        name: "source",
        options: [
          { label: _loc("DND5E.EFFECT.Action.RemoveStatus.all"), rule: true, value: "" },
          ...sources.map(([value, label]) => ({ label, value }))
        ]
      })
    }).outerHTML;

    return foundry.applications.api.DialogV2.prompt({
      rejectClose: false,
      content: `<fieldset>${group}</fieldset>`,
      window: { title },
      position: { width: 400 },
      ok: {
        label: "DND5E.Confirm",
        callback: (event, button) => button.form.elements.source.value
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Retrieve a list of dependent effects.
   * @returns {Array<ActiveEffect5e|Item5e>}
   */
  getDependents() {
    return (this.getFlag("dnd5e", "dependents") || []).reduce((arr, { uuid }) => {
      let doc;
      // TODO: Remove this special casing once https://github.com/foundryvtt/foundryvtt/issues/11214 is resolved
      if ( this.parent.pack && uuid.includes(this.parent.uuid) ) {
        const [, embeddedName, id] = uuid.replace(this.parent.uuid, "").split(".");
        doc = this.parent.getEmbeddedDocument(embeddedName, id);
      }
      else doc = fromUuidSync(uuid, { strict: false });
      if ( doc && (((doc instanceof ActiveEffect) && (doc.origin === this.uuid))
        || ((this.actor && (this.actor === doc.actor)) || (this.item && (this.item === doc.item)))) ) arr.push(doc);
      return arr;
    }, []).concat(dnd5e.registry.dependents.get(this));
  }

  /* -------------------------------------------- */
  /*  Importing and Exporting                     */
  /* -------------------------------------------- */

  /** @override */
  static async createDialog(data={}, createOptions={}, dialogOptions={}) {
    CreateDocumentDialog.migrateOptions(createOptions, dialogOptions);
    return CreateDocumentDialog.prompt(this, data, createOptions, dialogOptions);
  }

  /* -------------------------------------------- */

  /**
   * Prepare default list of types if none are specified.
   * @param {Actor5e} [parent]  Parent document within which this ActiveEffect will be created.
   * @returns {string[]}
   * @protected
   */
  static _createDialogTypes(parent) {
    return ActiveEffect.TYPES.filter(type => {
      return CONFIG.ActiveEffect.dataModels[type]?.availableForItem?.(parent) ?? true;
    });
  }

  /* -------------------------------------------- */

  /**
   * Determine default artwork based on the provided effect data.
   * @param {object} effectData  The source effect data.
   * @returns {{ img: string }}  Candidate effect image.
   */
  static getDefaultArtwork(effectData={}) {
    const type = effectData.type !== "base" ? effectData.type : "standard";
    return { img: CONFIG.DND5E.defaultArtwork.ActiveEffect[type] ?? this.DEFAULT_ICON };
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
   * Prepare an object of chat data used to display a card for the Item in the chat log.
   * @param {EnrichmentOptions} [enrichmentOptions={}]  Options for text enrichment.
   * @returns {object}              An object of chat data to render.
   */
  async getPreviewContext(enrichmentOptions={}) {
    let properties = [];
    if ( this.isSuppressed ) properties.push("DND5E.EFFECT.Status.Unavailable");
    else if ( this.disabled ) properties.push("DND5E.EFFECT.Status.Inactive");
    else if ( this.isTemporary ) properties.push("DND5E.EFFECT.Status.Temporary");
    else properties.push("DND5E.EFFECT.Status.Passive");
    if ( this.type === "enchantment" ) properties.push("DND5E.ENCHANTMENT.Label");
    if ( this.system.magical ) properties.push("DND5E.ITEM.Property.Magical");
    properties = properties.map(p => _loc(p));
    properties.unshift(...this.statuses.map(id => CONFIG.statusEffects[id]?.name).filter(_ => _));

    return {
      properties,
      description: await TextEditor.enrichHTML(this.description ?? "", {
        ...enrichmentOptions,
        relativeTo: this
        // TODO: Use this once https://github.com/foundryvtt/dnd5e/issues/5758 is resolved
        // rollData: this.getRollData()
      }),
      effect: this
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context used to display an effect on an actor or item sheet.
   * @returns {object}  Context needed to render the effect on an actor or item sheet.
   */
  async getSheetContext() {
    this.updateDuration();
    const { id, name, img, disabled, duration } = this;
    const source = await this.getSource();
    return {
      id, name, img, disabled, duration, source,
      changes: await Promise.all(this.changes.map(change => this.getSheetChangeContext(change))),
      durationParts: Number.isFinite(duration.remaining) ? duration.label.split(", ") : [],
      showDuration: Number.isFinite(duration.value),
      effect: this
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context for individual changes to display on actor, item, or active effect sheets.
   * @param {object} change  Change to prepare.
   * @returns {object}       Context needed to render the change.
   */
  async getSheetChangeContext(change) {
    const context = {
      ...change,
      typeLabel: _loc(ActiveEffect.CHANGE_TYPES[change.type]?.label),
      ...((await this.system.getSheetChangeContext?.(change)) ?? {})
    };
    context.name ||= change.key;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Render a rich tooltip for this effect.
   * @param {EnrichmentOptions} [enrichmentOptions={}]  Options for text enrichment.
   * @returns {Promise<{content: string, classes: string[]}>}
   */
  async richTooltip(enrichmentOptions={}) {
    const context = await this.getPreviewContext(enrichmentOptions);
    context.durationParts = Number.isFinite(this.duration.remaining) ? this.duration.label.split(", ") : [];
    context.showDuration = Number.isFinite(this.duration.value);

    return {
      content: await foundry.applications.handlebars.renderTemplate(
        "systems/dnd5e/templates/effects/parts/effect-tooltip.hbs", context
      ),
      classes: ["dnd5e2", "dnd5e-tooltip", "effect-tooltip", "themed", "theme-light"]
    };
  }

  /* -------------------------------------------- */

  /** @override */
  async deleteDialog({ sheet, ...dialogOptions }={}, operation={}) {
    const type = _loc(this.constructor.metadata.label);
    const config = foundry.utils.mergeObject({
      window: { title: `${_loc("DOCUMENT.Delete", { type })}: ${this.name}` },
      position: { width: 400 },
      content: `
        <p>
            <strong>${_loc("COMMON.AreYouSure")}</strong> ${_loc("SIDEBAR.DeleteWarning", { type })}
        </p>
      `,
      yes: { callback: () => this.delete(operation) }
    }, dialogOptions);
    if ( sheet ) return sheet._confirmDialog(config);
    return foundry.applications.api.DialogV2.confirm(config);
  }
}
