import SystemDataModel from "../../abstract.mjs";
import { ActivitiesField } from "../../fields/activities-field.mjs";
import UsesField from "../../shared/uses-field.mjs";

/**
 * Data model template for items with activities.
 *
 * @property {ActivityCollection} activities  Activities on this item.
 * @mixin
 */
export default class ActivitiesTemplate extends SystemDataModel {

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.USES"];

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      activities: new ActivitiesField(),
      uses: new UsesField()
    };
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
    const charged = source.recharge?.charged;
    if ( charged !== undefined ) {
      source.uses ??= {};
      source.uses.spent = charged ? 0 : 1;
    }

    if ( foundry.utils.getType(source.uses?.recovery) !== "string" ) return;

    // If period is charges, set the recovery type to `formula`
    if ( source.uses.per === "charges" ) {
      source.uses.recovery = [{ period: "lr", type: "formula", formula: source.uses.recovery }];
    }

    // If period is not blank, set recovery type to `recoverAll`
    else if ( source.uses.per ) {
      source.uses.recovery = [{ period: source.uses.per, type: "recoverAll" }];
    }

    // Otherwise, check to see if recharge is set
    else if ( source.recharge?.value ) {
      source.uses.recovery = [{ period: "recharge", formula: source.recharge.value }];
    }
  }

  /* -------------------------------------------- */

  /**
   * Modify data before initialization to create initial activity if necessary.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static initializeActivities(source) {
    // TODO: Handle migration of data kept on spells and inferred by activities
    // TODO: Handle migration of base damage, range, & ammunition on weapons
    if ( this.#shouldCreateInitialActivity(source) ) this.#createInitialActivity(source);
  }

  /* -------------------------------------------- */

  /**
   * Method to determine whether the activity creation migration should be performed. This migration should only be
   * performed on whole item data rather than partial updates, so check to ensure all of the necessary data is present.
   * @param {object} source  The candidate source data from which the model will be constructed.
   * @returns {boolean}
   */
  static #shouldCreateInitialActivity(source) {
    // If item doesn't have an action type or activation, then it doesn't need an activity
    if ( !source.system.actionType || !source.system.activation?.type ) return false;

    // If item was updated after `4.0.0`, it shouldn't need the migration
    if ( !foundry.utils.isNewerVersion("4.0.0", source._stats.systemVersion ?? "0.0.0") ) return false;

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
      abil: null, // TODO: No specific activity type for this, perhaps UtilityActivity with the ability as an enricher?
      save: "save",
      ench: "enchant",
      summ: "summon",
      heal: "heal"
    }[source.system.actionType] ?? "utility";
    if ( (type === "utility") && source.system.damage?.parts?.length ) type = "damage";

    const cls = CONFIG.DND5E.activityTypes[type].documentClass;
    cls.createInitialActivity(source);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare final data for the activities & uses.
   * @param {object} rollData
   */
  prepareFinalActivityData(rollData) {
    UsesField.prepareData.call(this, rollData);
  }
}
