import CreateDocumentDialog from "../applications/create-document-dialog.mjs";
import ConditionData from "../data/active-effect/condition.mjs";
import FormulaField from "../data/fields/formula-field.mjs";
import MappingField from "../data/fields/mapping-field.mjs";
import { parseOrString, simplifyBonus, staticID } from "../utils.mjs";
import Item5e from "./item.mjs";
import DependentDocumentMixin from "./mixins/dependent.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;
const { NumberField, ObjectField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import Actor5e from "./actor/actor.mjs";
 * @import { FavoriteData5e } from "../data/abstract/_types.mjs";
 */

const BONUS_SHIM_REGEX = new RegExp(/system\.(abilities|skills|tools)\.(\w+)\.bonuses\.(check|save)/);
const ATTACK_ABILITY_SHIM_REGEX = new RegExp(/system\.activities\.\w+\.attack\.ability/);

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
   * System-specific "expiry" choices which should not display duration.
   * @type {Set<string>}
   */
  static DURATIONLESS_EXPIRIES = new Set(["longRest", "shortRest"]);

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
    "system.attributes.concentration.bonuses.save": { key: "system.attributes.concentration.roll.bonus" },
    "system.attributes.death.bonuses.save": { key: "system.attributes.death.roll.bonus" },
    "system.attributes.init.bonus": { key: "system.attributes.init.roll.bonus" },
    "system.attributes.movement.speed": { key: "system.attributes.movement.walk" },
    "system.attributes.movement.burrow": { key: "system.attributes.movement.speeds.burrow" },
    "system.attributes.movement.climb": { key: "system.attributes.movement.speeds.climb" },
    "system.attributes.movement.fly": { key: "system.attributes.movement.speeds.fly" },
    "system.attributes.movement.jump": { key: "system.attributes.movement.speeds.jump" },
    "system.attributes.movement.swim": { key: "system.attributes.movement.speeds.swim" },
    "system.attributes.movement.walk": { key: "system.attributes.movement.speeds.walk" },
    "system.attributes.senses.darkvision": { key: "system.attributes.senses.ranges.darkvision" },
    "system.attributes.senses.blindsight": { key: "system.attributes.senses.ranges.blindsight" },
    "system.attributes.senses.tremorsense": { key: "system.attributes.senses.ranges.tremorsense" },
    "system.attributes.senses.truesight": { key: "system.attributes.senses.ranges.truesight" },
    "system.bonuses.mwak.attack": { key: "system.rolls.attack.mwak.bonus" },
    "system.bonuses.msak.attack": { key: "system.rolls.attack.msak.bonus" },
    "system.bonuses.rwak.attack": { key: "system.rolls.attack.rwak.bonus" },
    "system.bonuses.rsak.attack": { key: "system.rolls.attack.rsak.bonus" },
    "system.bonuses.mwak.damage": { key: "system.rolls.damage.mwak.bonus" },
    "system.bonuses.msak.damage": { key: "system.rolls.damage.msak.bonus" },
    "system.bonuses.rwak.damage": { key: "system.rolls.damage.rwak.bonus" },
    "system.bonuses.rsak.damage": { key: "system.rolls.damage.rsak.bonus" },
    "system.bonuses.abilities.check": { key: "system.rolls.ability.check.bonus" },
    "system.bonuses.abilities.save": { key: "system.rolls.ability.save.bonus" },
    "system.bonuses.abilities.skill": { key: "system.rolls.ability.skill.bonus" },
    "activities[attack].attack.ability": { key: "activities[attack].attack.abilities" }
  };

  /* -------------------------------------------- */

  /**
   * System-specific "expiry" choices which do not require registration or custom expiry events, and instead
   * are handled dynamically in isExpiryEvent.
   * @type {Set<string>}
   */
  static PSEUDO_EXPIRIES = new Set(["sourceStart", "sourceEnd", "targetStart", "targetEnd"]);

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
    if ( super.isSuppressed || this.system.isSuppressed ) return true;
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

  /** @inheritDoc */
  get isExpiryTrackable() {
    return super.isExpiryTrackable && !this.getFlag("dnd5e", "isTemporary");
  }

  /* -------------------------------------------- */

  /**
   * Get the special duration, if expiry is one, or null if none.
   * @returns {string|null}
   */
  get specialDuration() {
    return this.constructor.PSEUDO_EXPIRIES.has(this.duration.expiry) ? this.duration.expiry : null;
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

  /**
   * Synchronously retrieve the originating Actor, or null if it cannot be determined.
   * @returns {Actor5e|null}
   */
  getSourceActor() {
    const origin = fromUuidSync(this.origin);
    return (origin instanceof dnd5e.documents.Actor5e) ? origin : (origin?.actor || null);
  }

  /* -------------------------------------------- */

  /**
   * Format durationParts for use in the Active Effects & Effect Tooltip partials.
   * @returns {string[]}
   */
  getDurationParts() {
    if ( !this.expirySupportsDuration() ) return [this.duration.label];
    return Number.isFinite(this.duration.remaining) ? this.duration.label.split(", ") : [];
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

    if ( (model instanceof foundry.abstract.Document)
      && !change.effect._checkCondition(change, options.replacementData) ) return {};

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
    const { field, replacementData } = options;

    // Replace value when using string interpolation syntax
    if ( (field instanceof StringField) && (change.type === "override") && change.value?.includes?.("{}") ) {
      change.value = change.value.replace("{}", current ?? "");
    }

    // Handle `<=` when adding and `>=` when subtracting from number fields
    if ( (field instanceof NumberField)
      && (((change.type === "add") && change.value.includes?.("<="))
      || ((change.type === "subtract") && change.value.includes?.(">="))) ) {
      let [delta, limit] = change.value.split(/<=|>=/);
      try {
        delta = simplifyBonus(field._replaceDataRefs(delta, replacementData), {}, { strict: true });
        limit = simplifyBonus(field._replaceDataRefs(limit, replacementData), {}, { strict: true });
      } catch(err) {
        const warningHeader = change.effect ? `Active Effect (${change.effect.uuid}) | ` : "";
        console.warn(`${warningHeader} "${change.type}" change to ${change.key} failed to resolve: ${err.message}`);
        return current;
      }
      const result = change.type === "add"
        ? Math.max(current, Math.min(current + delta, limit))
        : Math.min(current, Math.max(current - delta, limit));
      return super.applyChangeField(model, { ...change, type: "override", value: result }, options);
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
   * Apply one of the rule active effect change types.
   * @type {ActiveEffectChangeHandler}
   */
  static _applyChangeRule(targetDoc, change, options) {
    if ( !targetDoc.appliedRules ) return;
    targetDoc.appliedRules.add(change);
  }

  /* -------------------------------------------- */

  /**
   * Modify the provided change according to a shim an emit a warning if required.
   * @param {EffectChangeData} change  The change being applied.
   * @returns {EffectChangeData}
   * @protected
   */
  _applyChangeShim(change) {
    let shim = ActiveEffect5e.SHIM_FIELDS[change.key];
    if ( !shim && ATTACK_ABILITY_SHIM_REGEX.test(change.key) ) {
      shim = { key: change.key.replace(/\.ability$/, ".abilities") };
    }
    if ( !shim ) {
      const [, category, key, type] = change.key.match(BONUS_SHIM_REGEX) ?? [];
      if ( !category ) return change;
      shim = { key: `system.${category}.${key}.${category === "abilities" ? `${type}.` : ""}roll.bonus` };
    }
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

  /**
   * Determine whether a specific change should be applied during this phase, setting `applied` if approved.
   * @param {object} change           Change that might be applied.
   * @param {object} [conditionData]  Data used to evaluate conditions.
   * @returns {boolean}
   * @internal
   */
  _checkCondition(change, conditionData) {
    if ( conditionData && !CONFIG.ActiveEffect.changeTypes[change.type]?.skipConditions ) {
      if ( this.system.conditions?.check(conditionData) === false ) return false;
      if ( change.conditions?.check(conditionData) === false ) return false;
    }

    const originalChange = this.system.changes.find(c => c._id === change._id);
    if ( originalChange ) originalChange.applied = true;

    return true;
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

  /** @inheritDoc */
  _prepareDuration(duration, context) {
    duration = super._prepareDuration(duration, context);
    if ( duration.expired && !Number.isFinite(duration.value) ) {
      duration.label = _loc("DND5E.ACTIVEEFFECT.Expired");
    }

    // Pseudo expires adjust label based on relationship to actor
    else if ( this.constructor.PSEUDO_EXPIRIES.has(duration.expiry) ) {
      const useYour = (this.modifiesActor || this.isAppliedEnchantment)
        && (duration.expiry.startsWith("target") || (this.getSourceActor() === this.actor));
      if ( useYour ) duration.label = _loc(`DND5E.ACTIVEEFFECT.Expiry.Your${duration.expiry.slice(6)}`);
      else duration.label = _loc(`DND5E.ACTIVEEFFECT.Expiry.${duration.expiry.capitalize()}`);
    }

    // Durationless expiries just use expiry name
    else if ( this.constructor.DURATIONLESS_EXPIRIES.has(duration.expiry) ) {
      duration.label = _loc(CONFIG.ActiveEffect.expiryEvents[duration.expiry]);
    }
    return duration;
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
   * Gather batch entries for conditions that are applied separately from an effect.
   * @returns {Promise<DatabaseWriteOperation[]>}  Batch entries suitable for `foundry.documents.modifyBatch`.
   */
  async collectRiderConditions() {
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

    const data = (await Promise.all(Array.from(riders).map(createRider))).filter(_ => _);
    if ( !data.length ) return [];
    return [{ action: "create", documentName: "ActiveEffect", data, parent: this.parent, keepId: true }];
  }

  /* -------------------------------------------- */

  /**
   * Gather batch entries for additional activities, effects, and items applied separately from an enchantment.
   * @param {object} options                       Options passed to the effect creation.
   * @returns {Promise<DatabaseWriteOperation[]>}  Batch entries suitable for `foundry.documents.modifyBatch`.
   */
  async collectRiderEnchantments(options={}) {
    const batchedUpdates = [];
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

    if ( !profile || !item ) return [];

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
      batchedUpdates.push({
        action: "update", documentName: "Item", parent: this.item.actor,
        updates: [{ _id: this.item.id, "system.activities": riderActivities }]
      });
      riderEffects = Object.values(riderActivities).flatMap(a =>
        a.effects?.map(e => item.effects.get(e._id)?.toObject())
      ).filter(e => e && !this.item.effects.has(e._id));
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
    batchedUpdates.push({
      action: "create", documentName: "ActiveEffect", data: riderEffects, parent: this.item, keepId: true
    });

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
      batchedUpdates.push({
        action: "create", documentName: "Item", data: riderItems, parent: this.actor, keepId: true
      });
    }

    return batchedUpdates;
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

    // Special expiries are evaluated live in isExpiryEvent so we set duration to `null` to so it's always triggered
    const { units, expiry } = this.duration;
    if ( expiry && !this.expirySupportsDuration(expiry) ) this.updateSource({ "duration.value": null });

    // Default combat-duration expiry to turnStart to avoid effect expiry at round turnover
    const actor = this.isAppliedEnchantment ? this.parent.parent : this.parent;
    if ( !(actor instanceof Actor) || !this.start?.combat?.started ) return;
    if ( !expiry && (units === "rounds") ) this.updateSource({ "duration.expiry": "turnStart" });
  }

  /* -------------------------------------------- */

  /**
   * Re-evaluate whether an actor should have the falling status. A creature that becomes prone or incapacitated while
   * airborne starts falling unless it can hover.
   * @param {Actor5e} actor  The actor to re-evaluate.
   * @returns {Promise<void>}
   */
  static async #updateFalling(actor) {
    if ( dnd5e.settings.disableFalling || !(actor instanceof Actor) ) return;
    const falling = actor.statuses.has("falling");
    if ( !falling && !actor.statuses.has("prone") && !actor.statuses.has("incapacitated") ) return;
    const shouldFall = actor.getActiveTokens(false, true).some(token => token._isFalling());
    if ( shouldFall === falling ) return;
    await actor.toggleStatusEffect("falling", { active: shouldFall });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static async _onCreateOperation(documents, operation, user) {
    await super._onCreateOperation(documents, operation, user);
    if ( user.id !== game.userId ) return;
    const batch = [];
    const actors = new Set();
    const prompted = new Set();
    for ( const effect of documents ) {
      if ( effect._shouldPromptConcentrationEnd() && !prompted.has(effect.parent) ) {
        prompted.add(effect.parent);
        await effect.parent.promptConcentrationEnd();
      }
      if ( effect.active && (effect.parent instanceof Actor) ) {
        batch.push(...await effect.collectRiderConditions());
        actors.add(effect.parent);
      }
      if ( effect.isAppliedEnchantment ) batch.push(...await effect.collectRiderEnchantments(operation));
    }
    if ( batch.length ) await foundry.documents.modifyBatch(batch);
    for ( const actor of actors ) await ActiveEffect5e.#updateFalling(actor);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preUpdate(changed, options, user) {
    if ( await super._preUpdate(changed, options, user) === false ) return false;
    const expiry = foundry.utils.getProperty(changed, "duration.expiry");
    if ( expiry && !this.expirySupportsDuration(expiry) ) foundry.utils.setProperty(changed, "duration.value", null);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    const originalEncumbrance = foundry.utils.getProperty(options, "dnd5e.originalEncumbrance");
    const newEncumbrance = data.statuses?.[0];
    const name = this.name;

    // If out of combat & effect expires, delete it
    if ( game.user.isActiveGM && data.duration?.expired ) {
      const actor = this.isAppliedEnchantment ? this.parent.parent : this.parent;
      const combat = this.start?.combat ?? game.combat;
      if ( !combat?.getCombatantsByActor(actor).length ) return this.delete();
    }

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
  static async _onDeleteOperation(documents, operation, user) {
    await super._onDeleteOperation(documents, operation, user);
    if ( game.user === game.users.activeGM ) {
      const dependents = new Map();
      const pseudo = new Map();
      for ( const effect of documents ) {
        for ( const dependent of effect.getDependents() ) {
          let { collectionName, documentName, parent } = dependent;
          const descriptor = { collectionName, documentName, ids: new Set() };
          if ( !(dependent instanceof foundry.abstract.Document) ) {
            parent = dependent.item;
            pseudo.getOrInsert(parent, descriptor).ids.add(dependent.id);
            continue;
          }
          dependents.getOrInsert(parent, descriptor).ids.add(dependent.id);
        }
      }
      const batch = [
        ...dependents.entries().map(([parent, { documentName, ids }]) => {
          return { documentName, parent, action: "delete", ids: Array.from(ids) };
        }).toArray(),
        ...pseudo.entries().map(([parent, { collectionName, ids }]) => {
          return {
            action: "update", documentName: "Item", parent: parent.parent,
            updates: [{ _id: parent.id, ...Object.fromEntries(ids.map(id => [`system.${collectionName}.${id}`, _del])) }]
          };
        })
      ];
      if ( batch.length ) await foundry.documents.modifyBatch(batch);
    }

    if ( user.id !== game.userId ) return;

    // Re-evaluate falling once per affected actor, since removing prone or incapacitating effects can end a fall.
    const actors = new Set();
    for ( const effect of documents ) {
      if ( !effect.statuses.has("falling") && (effect.parent instanceof Actor) ) actors.add(effect.parent);
    }
    for ( const actor of actors ) await ActiveEffect5e.#updateFalling(actor);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _displayScrollingStatus(enabled) {
    if ( this.isConcealed ) return;
    super._displayScrollingStatus(enabled);
  }

  /* -------------------------------------------- */
  /*  Expiration                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  isExpiryEvent(event, context={}) {
    const special = this.specialDuration;
    if ( !special ) return super.isExpiryEvent(event, context);

    // Out of combat, any time advancement expires the effect
    if ( (event === "updateWorldTime") && !this.actor?.inCombat ) return true;

    // Skip irrelevant events
    const isStart = special.endsWith("Start");
    if ( event !== (isStart ? "turnStart" : "turnEnd") ) return false;

    // These expiries are only driven by the combat they were created in
    if ( !this.start.combat ) return true;
    const combat = context.combat ?? game.combat;
    if ( combat !== this.start.combat ) return false;

    // Re-derive the expiry-relevant combatant; affected actor for "target" or originating actor for "source"
    // If they have left combat, expire once we are past the creation round
    const origin = special.startsWith("target") ? this.actor : this.getSourceActor();
    const [combatant] = combat.getCombatantsByActor(origin);
    if ( !combatant ) return this.start.round < context.round;

    // Only the origin's own turn edge triggers expiry
    const originTurn = isStart ? (combat.combatant === combatant) : (combat.previous.combatantId === combatant.id);
    if ( !originTurn ) return false;

    // Skip the turn the effect was applied on
    return (this.start.round !== context.round) || (this.start.turn !== context.turn);
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
      const item = effect.getFlag("dnd5e", "item");
      acc[effect.id] = item?.data?.name ?? actor.items.get(item?.id)?.name ?? _loc("DND5E.CONCENTRATION.NoSource");
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
   * Determine whether the provided expiry should be able to display duration fields.
   * @param {string} [expiry]  Active effect expiry event to check, defaults to this effect's current expiry.
   * @returns {boolean}
   */
  expirySupportsDuration(expiry=this.duration.expiry) {
    return !this.constructor.PSEUDO_EXPIRIES.has(expiry) && !this.constructor.DURATIONLESS_EXPIRIES.has(expiry);
  }

  /* -------------------------------------------- */

  /**
   * Prepare an object of chat data used to display a card for the Item in the chat log.
   * @param {EnrichmentOptions} [enrichmentOptions={}]  Options for text enrichment.
   * @param {string} [enrichmentOptions.extras]         Extra HTML displayed with the tooltip.
   * @returns {object}              An object of chat data to render.
   */
  async getPreviewContext({ extras, ...enrichmentOptions }={}) {
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
      extras, properties,
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
      durationParts: this.getDurationParts(),
      showDuration: !this.expirySupportsDuration() || Number.isFinite(this.duration.value),
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
   * @param {string} [enrichmentOptions.extras]         Extra HTML displayed with the tooltip.
   * @returns {Promise<{content: string, classes: string[]}>}
   */
  async richTooltip(enrichmentOptions={}) {
    const context = await this.getPreviewContext(enrichmentOptions);
    context.durationParts = this.getDurationParts();
    context.showDuration = !this.expirySupportsDuration() || Number.isFinite(this.duration.value);

    return {
      content: await foundry.applications.handlebars.renderTemplate(
        "systems/dnd5e/templates/effects/parts/effect-tooltip.hbs", context
      ),
      classes: ["dnd5e2", "dnd5e-tooltip", "effect-tooltip"]
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

  /* -------------------------------------------- */
  /*  Deprecations                                */
  /* -------------------------------------------- */

  /**
   * Create conditions that are applied separately from an effect.
   * @returns {Promise<ActiveEffect5e[]>}      Created rider effects.
   * @deprecated since DnD5e 6.0
   */
  async createRiderConditions() {
    foundry.utils.logCompatibilityWarning(
      "The `createRiderConditions` method has been deprecated in favor of `collectRiderConditions`, which returns "
      + "batch entries rather than creating documents.",
      { since: "DnD5e 6.0", until: "DnD5e 6.2", once: true }
    );
    const created = [];
    for ( const { data, keepId, parent } of await this.collectRiderConditions() ) {
      created.push(...await ActiveEffect5e.createDocuments(data, { keepId, parent }));
    }
    return created;
  }

  /* -------------------------------------------- */

  /**
   * Create additional activities, effects, and items that are applied separately from an enchantment.
   * @param {object} options  Options passed to the effect creation.
   * @deprecated since DnD5e 6.0
   */
  async createRiderEnchantments(options={}) {
    foundry.utils.logCompatibilityWarning(
      "The `createRiderEnchantments` method has been deprecated in favor of `collectRiderEnchantments`, which returns "
      + "batch entries rather than applying them.",
      { since: "DnD5e 6.0", until: "DnD5e 6.2", once: true }
    );
    const batch = await this.collectRiderEnchantments(options);
    if ( batch.length ) await foundry.documents.modifyBatch(batch);
  }
}
