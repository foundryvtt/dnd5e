import { formatNumber } from "../../utils.mjs";

/**
 * Extension of the core calendar with extra formatters.
 */
export default class CalendarData5e extends foundry.data.CalendarData {
  /* -------------------------------------------- */
  /*  Calendar Helper Methods                     */
  /* -------------------------------------------- */

  /**
   * Progress between sunrise and sunset assuming it is daylight half the day duration.
   * @param {number|Components} [time]  The time to use, by default the current world time.
   * @returns {number}                  Progress through day period, with 0 representing sunrise and 1 sunset.
   */
  progressDay(time=game.time.worldTime) {
    const components = typeof time === "number" ? this.timeToComponents(time) : time;
    const daylightHours = this.days.hoursPerDay / 2;
    return (components.hour - (daylightHours / 2)) / daylightHours;
  }

  /* -------------------------------------------- */

  /**
   * Progress between sunset and sunrise assuming it is night half the day duration.
   * @param {number|Components} [time]  The time to use, by default the current world time.
   * @returns {number}                  Progress through night period, with 0 representing sunset and 1 sunrise.
   */
  progressNight(time=game.time.worldTime) {
    const components = typeof time === "number" ? this.timeToComponents(time) : time;
    const daylightHours = this.days.hoursPerDay / 2;
    let hour = components.hour;
    if ( components.hour < daylightHours ) hour += this.days.hoursPerDay;
    return (hour - (daylightHours * 1.5)) / daylightHours;
  }

  /* -------------------------------------------- */
  /*  Formatter Functions                         */
  /* -------------------------------------------- */

  /**
   * @typedef CalendarFormattingContext
   * @property {string} y  Year number with at least 4 digits.
   * @property {string} b  Month abbreviation.
   * @property {string} B  Full month name.
   * @property {string} m  Month number with at least 2 digits.
   * @property {string} d  Day of month with at least 2 digits.
   * @property {string} D  Ordinal day of month (e.g. 1st, 2nd).
   * @property {string} j  Day of year with at least 3 digits.
   * @property {string} w  Day number in week.
   * @property {string} H  Hours with at least 2 digits.
   * @property {string} M  Minutes with at least 2 digits.
   * @property {string} S  Seconds with at least 2 digits.
   */

  /**
   * Prepared date parts passed to the localization.
   * @param {CalendarData} calendar      The configured calendar
   * @param {TimeComponents} components  Time components to format
   * @returns {CalendarFormattingContext}
   */
  static dateFormattingParts(calendar, components) {
    const month = calendar.months.values[components.month];
    return {
      // Year
      Y: components.year.paddedString(4),

      // Month
      b: month.abbreviation,
      B: game.i18n.localize(month.name),
      m: month.ordinal.paddedString(2),

      // Week
      // a: Day of week abbreviation (e.g. Mon, Tue)
      // A: Day of week full name (e.g. Monday, Tuesday)
      // W: week number of the year

      // Day
      d: (components.dayOfMonth + 1).paddedString(2),
      D: formatNumber(components.dayOfMonth + 1, { ordinal: true }),
      j: (components.day + 1).paddedString(3),
      w: String(components.dayOfWeek + 1),

      // Hour
      H: components.hour.paddedString(2),

      // Minute
      M: components.minute.paddedString(2),

      // Second
      S: components.second.paddedString(2)
    };
  }

  /* -------------------------------------------- */

  /**
   * Format the time to a value including hours and minutes.
   * @param {CalendarData} calendar      The configured calendar.
   * @param {TimeComponents} components  Time components to format.
   * @param {object} options             Additional formatting options.
   * @returns {string}                   The returned string format.
   */
  static formatHoursMinutes(calendar, components, options) {
    return CalendarData5e.formatLocalized(
      "DND5E.CALENDAR.Formatters.HoursMinutes.Format", calendar, components, options
    );
  }

  /* -------------------------------------------- */

  /**
   * Format the time to a value including hours, minutes, and seconds.
   * @param {CalendarData} calendar      The configured calendar.
   * @param {TimeComponents} components  Time components to format.
   * @param {object} options             Additional formatting options.
   * @returns {string}                   The returned string format.
   */
  static formatMonthHoursMinutesSeconds(calendar, components, options) {
    return CalendarData5e.formatLocalized(
      "DND5E.CALENDAR.Formatters.HoursMinutesSeconds.Format", calendar, components, options
    );
  }

  /* -------------------------------------------- */

  /**
   * Format the date using the provided localization key and the default formatting parts.
   * @param {string} localizationKey     Key to use for localization.
   * @param {CalendarData} calendar      The configured calendar.
   * @param {TimeComponents} components  Time components to format.
   * @param {object} options             Additional formatting options.
   * @returns {string}                   The returned string format.
   */
  static formatLocalized(localizationKey, calendar, components, options) {
    return game.i18n.format(localizationKey, CalendarData5e.dateFormattingParts(calendar, components));
  }

  /* -------------------------------------------- */

  /**
   * Format the date to a value including month and day.
   * @param {CalendarData} calendar      The configured calendar.
   * @param {TimeComponents} components  Time components to format.
   * @param {object} options             Additional formatting options.
   * @returns {string}                   The returned string format.
   */
  static formatMonthDay(calendar, components, options) {
    return CalendarData5e.formatLocalized(
      "DND5E.CALENDAR.Formatters.MonthDay.Format", calendar, components, options
    );
  }

  /* -------------------------------------------- */

  /**
   * Format the date to a value including month, day, and year.
   * @param {CalendarData} calendar      The configured calendar.
   * @param {TimeComponents} components  Time components to format.
   * @param {object} options             Additional formatting options.
   * @returns {string}                   The returned string format.
   */
  static formatMonthDayYear(calendar, components, options) {
    return CalendarData5e.formatLocalized(
      "DND5E.CALENDAR.Formatters.MonthDayYear.Format", calendar, components, options
    );
  }
}
