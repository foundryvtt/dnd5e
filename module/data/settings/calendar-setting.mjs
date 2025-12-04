const { BooleanField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { CalendarConfigSettingData, CalendarPreferencesSettingData } from "./_types.mjs";
 */

/**
 * A data model that represents the GM-specific calendar settings.
 * @extends {foundry.abstract.DataModel<CalendarConfigSettingData>}
 * @mixes CalendarConfigSettingData
 */
export class CalendarConfigSetting extends foundry.abstract.DataModel {

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.CALENDAR"];

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      enabled: new BooleanField()
    };
  }
}

/* -------------------------------------------- */

/**
 * A data model that represents the player visible calendar settings.
 * @extends {foundry.abstract.DataModel<CalendarPreferencesSettingData>}
 * @mixes CalendarPreferencesSettingData
 */
export class CalendarPreferencesSetting extends foundry.abstract.DataModel {

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.CALENDAR"];

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      formatters: new SchemaField({
        date: new StringField({ required: true, initial: "monthDay" }),
        time: new StringField({ required: true, initial: "hoursMinutes" })
      }),
      visible: new BooleanField({ required: true, initial: true })
    };
  }
}
