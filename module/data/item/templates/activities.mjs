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
