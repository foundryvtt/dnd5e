const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * A data model that represents the GM-specific calendar settings.
 */
export class CalendarConfigSetting extends foundry.abstract.DataModel {

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.CALENDAR"];

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      enabled: new BooleanField({ required: true })
    };
  }
}

/**
 * A data model that represents the player visible calendar settings.
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
