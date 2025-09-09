import CastActivity from "../../../documents/activity/cast.mjs";
import SystemDataModel from "../../abstract/system-data-model.mjs";
import { ActivitiesField } from "../../fields/activities-field.mjs";
import UsesField from "../../shared/uses-field.mjs";

/**
 * Data model template for items with activities.
 *
 * @property {ActivityCollection} activities  Activities on this item.
 * @property {UsesData} uses                  Item's limited uses & recovery.
 * @mixin
 */
export default class ActivitiesTemplate extends SystemDataModel {

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.USES"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      activities: new ActivitiesField(),
      uses: new UsesField()
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Which ability score modifier is used by this item?
   * @type {string|null}
   */
  get abilityMod() {
    return this._typeAbilityMod || null;
  }

  /**
   * Default ability key defined for this type.
   * @type {string|null}
   * @internal
   */
  get _typeAbilityMod() {
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Enchantments that have been applied by this item.
   * @type {ActiveEffect5e[]}
   */
  get appliedEnchantments() {
    return dnd5e.registry.enchantments.applied(this.parent.uuid);
  }

  /* -------------------------------------------- */

  /**
   * Value on a d20 die needed to roll a critical hit with an attack from this item.
   * @type {number|null}
   */
  get criticalThreshold() {
    return this._typeCriticalThreshold ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement an attack roll as part of its usage?
   * @type {boolean}
   */
  get hasAttack() {
    return !!this.activities.getByType("attack").length;
  }

  /* -------------------------------------------- */

  /**
   * Is this Item limited in its ability to be used by charges or by recharge?
   * @type {boolean}
   */
  get hasLimitedUses() {
    return !!this._source.uses.max || !!this.uses.max;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item implement a saving throw as part of its usage?
   * @type {boolean}
   */
  get hasSave() {
    return !!this.activities.getByType("save").length;
  }

  /* -------------------------------------------- */

  /**
   * Does this Item implement summoning as part of its usage?
   * @type {boolean}
   */
  get hasSummoning() {
    const activity = this.activities.getByType("summon")[0];
    return activity && activity.profiles.length > 0;
  }

  /* -------------------------------------------- */

  /**
   * Is this Item an activatable item?
   * @type {boolean}
   */
  get isActive() {
    return this.activities.size > 0;
  }

  /* -------------------------------------------- */

  /**
   * Can this item enchant other items?
   * @type {boolean}
   */
  get isEnchantment() {
    return !!this.activities.getByType("enchant").length;
  }

  /* -------------------------------------------- */

  /**
   * Does the Item provide an amount of healing instead of conventional damage?
   * @type {boolean}
   */
  get isHealing() {
    return !!this.activities.getByType("heal").length;
  }

  /* -------------------------------------------- */

  /**
   * Creatures summoned by this item.
   * @type {Actor5e[]}
   */
  get summonedCreatures() {
    if ( !this.actor ) return [];
    return this.activities.getByType("summon").map(a => a.summonedCreatures).flat();
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /**
   * Migrate the uses data structure from before activities.
   * @param {object} source  Candidate source data to migrate.
   */
  static migrateActivities(source) {
    ActivitiesTemplate.#migrateUses(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the uses to the new data structure.
   * @param {object} source  Candidate source data to migrate.
   */
  static #migrateUses(source) {
    // Remove any old ternary operators from uses to prevent errors
    if ( source.uses?.max?.includes?.(" ? ") ) source.uses.max = "";
    for ( const activity of Object.values(source.activities ?? {}) ) {
      if ( activity?.uses?.max?.includes?.(" ? ") ) activity.uses.max = "";
    }

    if ( Array.isArray(source.uses?.recovery) ) return;

    const charged = source.recharge?.charged;
    if ( (source.recharge?.value !== null) && (charged !== undefined) && !source.uses?.max ) {
      source.uses ??= {};
      source.uses.spent = charged ? 0 : 1;
      source.uses.max = "1";
    }

    if ( foundry.utils.getType(source.uses?.recovery) !== "string" ) return;

    // If period is charges, set the recovery type to `formula`
    if ( source.uses?.per === "charges" ) {
      if ( source.uses.recovery ) {
        source.uses.recovery = [{ period: "lr", type: "formula", formula: source.uses.recovery }];
      } else {
        delete source.uses.recovery;
      }
    }

    // If period is not blank, set an appropriate recovery type
    else if ( source.uses?.per ) {
      if ( CONFIG.DND5E.limitedUsePeriods[source.uses.per]?.formula && source.uses.recovery ) {
        source.uses.recovery = [{ period: source.uses.per, type: "formula", formula: source.uses.recovery }];
      }
      else source.uses.recovery = [{ period: source.uses.per, type: "recoverAll" }];
    }

    // Otherwise, check to see if recharge is set
    else if ( source.recharge?.value ) {
      source.uses.recovery = [{ period: "recharge", formula: source.recharge.value }];
    }

    // Prevent a string value for uses recovery from being cleaned into a default recovery entry
    else if ( source.uses?.recovery === "" ) {
      delete source.uses.recovery;
    }
  }

  /* -------------------------------------------- */

  /**
   * Modify data before initialization to create initial activity if necessary.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static initializeActivities(source) {
    if ( this.#shouldCreateInitialActivity(source) ) this.#createInitialActivity(source);
    const uses = source.system?.uses ?? {};
    if ( source._id && source.type && ("value" in uses) && uses.max ) {
      foundry.utils.setProperty(source, "flags.dnd5e.migratedUses", uses.value);
    }
  }

  /* -------------------------------------------- */

  /**
   * Method to determine whether the activity creation migration should be performed. This migration should only be
   * performed on whole item data rather than partial updates, so check to ensure all of the necessary data is present.
   * @param {object} source  The candidate source data from which the model will be constructed.
   * @returns {boolean}
   */
  static #shouldCreateInitialActivity(source) {
    // Do not attempt to migrate partial source data.
    if ( !source._id || !source.type || !source.system || !source.effects ) return false;

    // If item doesn't have an action type or activation, then it doesn't need an activity
    if ( !source.system.actionType && !source.system.activation?.type
      && (source.type !== "tool") ) return false;

    // If item was updated after `4.0.1`, it shouldn't need the migration
    if ( !foundry.utils.isNewerVersion("4.0.1", source._stats?.systemVersion ?? "0.0.0") ) return false;

    // If the initial activity has already been created, no reason to create it again
    if ( !foundry.utils.isEmpty(source.system.activities) ) return false;

    return true;
  }

  /* -------------------------------------------- */

  /**
   * Migrate data from ActionTemplate and ActivatedEffectTemplate into a newly created activity.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #createInitialActivity(source) {
    let type = {
      mwak: "attack",
      rwak: "attack",
      msak: "attack",
      rsak: "attack",
      abil: "check",
      save: "save",
      ench: "enchant",
      summ: "summon",
      heal: "heal"
    }[source.system.actionType] ?? "utility";
    if ( (type === "utility") && source.system.damage?.parts?.length ) type = "damage";
    if ( source.type === "tool" ) type = "check";

    const cls = CONFIG.DND5E.activityTypes[type].documentClass;
    cls.createInitialActivity(source);

    if ( (type !== "save") && source.system.save?.ability ) {
      CONFIG.DND5E.activityTypes.save.documentClass.createInitialActivity(source, { offset: 1 });
    }
    if ( (source.type !== "weapon") && source.system.damage?.versatile ) {
      CONFIG.DND5E.activityTypes.damage.documentClass.createInitialActivity(source, { offset: 2, versatile: true });
    }
    if ( (type !== "utility") && source.system.formula ) {
      CONFIG.DND5E.activityTypes.utility.documentClass.createInitialActivity(source, { offset: 3 });
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare final data for the activities & uses.
   * @param {object} rollData
   */
  prepareFinalActivityData(rollData) {
    const labels = this.parent.labels;
    UsesField.prepareData.call(this, rollData, labels);
    for ( const activity of this.activities ) activity.prepareFinalData();
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve information on available uses for display.
   * @returns {{value: number, max: number, name: string}}
   */
  getUsesData() {
    return { value: this.uses.value, max: this.uses.max, name: "system.uses.value" };
  }

  /* -------------------------------------------- */

  /**
   * Perform any item & activity uses recovery.
   * @param {string[]} periods  Recovery periods to check.
   * @param {object} rollData   Roll data to use when evaluating recover formulas.
   * @returns {Promise<{ updates: object, rolls: BasicRoll[] }>}
   */
  async recoverUses(periods, rollData) {
    const updates = {};
    const rolls = [];
    const autoRecharge = game.settings.get("dnd5e", "autoRecharge");
    const shouldRecharge = periods.includes("turnStart") && (this.parent.actor.type === "npc")
      && (autoRecharge !== "no");
    const recharge = async doc => {
      const config = { apply: false };
      const message = { create: autoRecharge !== "silent" };
      const result = await UsesField.rollRecharge.call(doc, config, {}, message);
      if ( result ) {
        if ( doc instanceof Item ) foundry.utils.mergeObject(updates, result.updates);
        else foundry.utils.mergeObject(updates, { [`system.activities.${doc.id}`]: result.updates });
        rolls.push(...result.rolls);
      }
    };

    const result = await UsesField.recoverUses.call(this, periods, rollData);
    if ( result ) {
      foundry.utils.mergeObject(updates, { "system.uses": result.updates });
      rolls.push(...result.rolls);
    }
    if ( shouldRecharge ) await recharge(this.parent);

    for ( const activity of this.activities ) {
      const result = await UsesField.recoverUses.call(activity, periods, rollData);
      if ( result ) {
        foundry.utils.mergeObject(updates, { [`system.activities.${activity.id}.uses`]: result.updates });
        rolls.push(...result.rolls);
      }
      if ( shouldRecharge ) await recharge(activity);
    }

    return { updates, rolls };
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /**
   * Perform any necessary actions when an item with activities is created.
   * @param {object} data     The initial data object provided to the document creation request.
   * @param {object} options  Additional options which modify the update request.
   * @param {string} userId   The id of the User requesting the document update.
   */
  async onCreateActivities(data, options, userId) {
    if ( (userId !== game.user.id) || !this.parent.isEmbedded ) return;

    // If item has any Cast activities, create locally cached copies of the spells
    const spells = (await Promise.all(
      this.activities.getByType("cast").map(a => !a.cachedSpell && a.getCachedSpellData())
    )).filter(_ => _);
    if ( spells.length ) this.parent.actor.createEmbeddedDocuments("Item", spells);
  }

  /* -------------------------------------------- */

  /**
   * Prepare any item or actor changes based on activity changes.
   * @param {object} changed  The differential data that is changed relative to the document's prior values.
   * @param {object} options  Additional options which modify the update request.
   * @param {User} user       The User requesting the document update.
   */
  async preUpdateActivities(changed, options, user) {
    if ( !foundry.utils.hasProperty(changed, "system.activities") ) return;

    // Track changes to rider activities & effects and store in item flags
    const cloneChanges = foundry.utils.deepClone(changed);
    const riders = this.parent.clone(cloneChanges).system.activities.getByType("enchant").reduce((riders, a) => {
      a.effects.forEach(e => {
        e.riders.activity.forEach(activity => riders.activity.add(activity));
        e.riders.effect.forEach(effect => riders.effect.add(effect));
      });
      return riders;
    }, { activity: new Set(), effect: new Set() });
    if ( !riders.activity.size && !riders.effect.size ) {
      foundry.utils.setProperty(changed, "flags.dnd5e.-=riders", null);
    } else {
      foundry.utils.setProperty(changed, "flags.dnd5e.riders", Object.entries(riders)
        .reduce((updates, [key, value]) => {
          if ( value.size ) updates[key] = Array.from(value);
          else updates[`-=${key}`] = null;
          return updates;
        }, {})
      );
    }

    if ( !this.parent.isEmbedded ) return;

    // Track changes to cached spells on cast activities
    const removed = Object.entries(changed.system?.activities ?? {}).map(([key, data]) => {
      if ( key.startsWith("-=") ) {
        const id = key.replace("-=", "");
        return this.activities.get(id).cachedSpell?.id;
      } else if ( foundry.utils.hasProperty(data, "spell.uuid") ) {
        return this.activities.get(key)?.cachedSpell?.id;
      }
      return null;
    }).filter(_ => _);
    if ( removed.length ) foundry.utils.setProperty(options, "dnd5e.removedCachedItems", removed);
  }

  /* -------------------------------------------- */

  /**
   * Perform any additional updates when an item with activities is updated.
   * @param {object} changed  The differential data that is changed relative to the document's prior values.
   * @param {object} options  Additional options which modify the update request.
   * @param {string} userId   The id of the User requesting the document update.
   */
  async onUpdateActivities(changed, options, userId) {
    if ( (userId !== game.user.id) || !this.parent.isEmbedded
      || !foundry.utils.hasProperty(changed, "system.activities") ) return;

    // If any Cast activities were removed, or their spells changed, remove old cached spells
    if ( options.dnd5e?.removedCachedItems ) {
      await this.parent.actor.deleteEmbeddedDocuments("Item", options.dnd5e.removedCachedItems);
    }

    // Create any new cached spells & update existing ones as necessary
    const cachedInserts = [];
    for ( const id of Object.keys(changed.system.activities) ) {
      const activity = this.activities.get(id);
      if ( !(activity instanceof CastActivity) ) continue;
      const existingSpell = activity.cachedSpell;
      if ( existingSpell ) {
        const enchantment = existingSpell.effects.get(CastActivity.ENCHANTMENT_ID);
        await enchantment?.update({ changes: activity.getSpellChanges() });
      } else {
        const cached = await activity.getCachedSpellData();
        if ( cached ) cachedInserts.push(cached);
      }
    }
    if ( cachedInserts.length ) await this.parent.actor.createEmbeddedDocuments("Item", cachedInserts);
  }

  /* -------------------------------------------- */

  /**
   * Perform any necessary cleanup when an item with activities is deleted.
   * @param {object} options  Additional options which modify the deletion request.
   * @param {string} userId   The id of the User requesting the document update.
   */
  onDeleteActivities(options, userId) {
    if ( (userId !== game.user.id) || !this.parent.isEmbedded ) return;

    // If item has any Cast activities, clean up any cached spells
    const spellIds = this.activities.getByType("cast").map(a => a.cachedSpell?.id).filter(_ => _);
    if ( spellIds.length ) this.parent.actor.deleteEmbeddedDocuments("Item", spellIds);
  }

  /* -------------------------------------------- */
  /*  Shims                                       */
  /* -------------------------------------------- */

  /**
   * Apply shims for data removed from ActionTemplate & ActivatedEffectTemplate.
   * @this {ItemDataModel}
   */
  static _applyActivityShims() {
    foundry.utils.logCompatibilityWarning(
      "The `_applyActivityShims` method has been deprecated and should no longer be called.",
      { since: "DnD5e 5.0", until: "DnD5e 5.2", once: true }
    );
  }
}
