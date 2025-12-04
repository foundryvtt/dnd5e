import { formatNumber } from "../../utils.mjs";

/**
 * @import { CalendarFormattingContext, CalendarTimeDeltas } from "./_types.mjs";
 */

/**
 * Extension of the core calendar with extra formatters.
 */
export default class CalendarData5e extends foundry.data.CalendarData {

  /* -------------------------------------------- */
  /*  Calendar Helper Methods                     */
  /* -------------------------------------------- */

  /**
   * Calculate the decimal hours since the start of the day.
   * @param {number|TimeComponents} [time]  The time to use, by default the current world time.
   * @param {CalendarData} [calendar]       Calendar to use, by default the current world calendar.
   * @returns {number}                      Number of hours since the start of the day as a decimal.
   */
  static hoursOfDay(time=game.time.components, calendar=game.time.calendar) {
    const components = typeof time === "number" ? this.timeToComponents(time) : time;
    const minutes = components.minute + (components.second / calendar.days.secondsPerMinute);
    return components.hour + (minutes / calendar.days.minutesPerHour);
  }

  /* -------------------------------------------- */

  /**
   * Get the number of hours in a given day.
   * @param {number|TimeComponents} [time]  The time to use, by default the current world time.
   * @returns {number}                      Number of hours between sunrise and sunset.
   */
  daylightHours(time=game.time.components) {
    return this.sunset(time) - this.sunrise(time);
  }

  /* -------------------------------------------- */

  /**
   * Progress between sunrise and sunset assuming it is daylight half the day duration.
   * @param {number|TimeComponents} [time]  The time to use, by default the current world time.
   * @returns {number}                      Progress through day period, with 0 representing sunrise and 1 sunset.
   */
  progressDay(time=game.time.components) {
    return (CalendarData5e.hoursOfDay(time) - this.sunrise(time)) / this.daylightHours(time);
  }

  /* -------------------------------------------- */

  /**
   * Progress between sunset and sunrise assuming it is night half the day duration.
   * @param {number|TimeComponents} [time]  The time to use, by default the current world time.
   * @returns {number}                      Progress through night period, with 0 representing sunset and 1 sunrise.
   */
  progressNight(time=game.time.components) {
    const daylightHours = this.daylightHours(time);
    let hour = CalendarData5e.hoursOfDay(time);
    if ( hour < daylightHours ) hour += this.days.hoursPerDay;
    return (hour - this.sunset(time)) / daylightHours;
  }

  /* -------------------------------------------- */

  /**
   * Get the sunrise time for a given day.
   * @param {number|TimeComponents} [time]  The time to use, by default the current world time.
   * @returns {number}                      Sunrise time in hours.
   */
  sunrise(time=game.time.components) {
    return this.days.hoursPerDay * .25;
  }

  /* -------------------------------------------- */

  /**
   * Get the sunset time for a given day.
   * @param {number|TimeComponents} [time]  The time to use, by default the current world time.
   * @returns {number}                      Sunset time in hours.
   */
  sunset(time=game.time.components) {
    return this.days.hoursPerDay * .75;
  }

  /* -------------------------------------------- */
  /*  Set Date Methods                            */
  /* -------------------------------------------- */

  /**
   * Set the date to a specific year, month, or day. Any values not provided will remain the same.
   * @param {object} components
   * @param {number} [components.year]   Visible year (with `yearZero` added in).
   * @param {number} [components.month]  Index of month.
   * @param {number} [components.day]    Day within the month.
   */
  async jumpToDate({ year, month, day }) {
    const components = { ...game.time.components };
    year ??= components.year + this.years.yearZero;
    month ??= components.month;
    day ??= components.dayOfMonth;

    // Subtract out year zero
    components.year = year - this.years.yearZero;
    const { leapYear } = this._decomposeTimeYears(this.componentsToTime(components));

    // Convert days within month to day of year
    let dayOfYear = day - 1;
    for ( let idx=0; idx<month; idx++ ) {
      const m = this.months.values[idx];
      dayOfYear += leapYear ? (m.leapDays ?? m.days) : m.days;
    }
    components.day = dayOfYear;
    components.month = month;

    await game.time.set(components);
  }

  /* -------------------------------------------- */
  /*  Formatter Functions                         */
  /* -------------------------------------------- */

  /**
   * Prepared date parts passed to the localization.
   * @param {CalendarData} calendar      The configured calendar.
   * @param {TimeComponents} components  Time components to format.
   * @returns {CalendarFormattingContext}
   */
  static dateFormattingParts(calendar, components) {
    const month = calendar.months.values[components.month];
    return {
      // Year
      y: components.year + calendar.years.yearZero,
      yyyy: (components.year + calendar.years.yearZero).paddedString(4),

      // Month
      b: month.abbreviation,
      B: game.i18n.localize(month.name),
      m: month.ordinal,
      mm: month.ordinal.paddedString(2),

      // Week
      // a: Day of week abbreviation (e.g. Mon, Tue)
      // A: Day of week full name (e.g. Monday, Tuesday)
      // W: week number of the year

      // Day
      d: components.dayOfMonth + 1,
      dd: (components.dayOfMonth + 1).paddedString(2),
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
   * Format the date to approximate value based on season (e.g. "Early Spring", "Mid-Winter").
   * @param {CalendarData} calendar      The configured calendar.
   * @param {TimeComponents} components  Time components to format.
   * @param {object} options             Additional formatting options.
   * @returns {string}                   The returned string format.
   */
  static formatApproximateDate(calendar, components, options) {
    const season = calendar.seasons.values[components.season];
    let day = components.day;
    let seasonStart = season.dayStart;
    let seasonEnd = season.dayEnd;
    let days = 0;
    for ( const month of calendar.months.values ) {
      if ( (seasonStart !== null) && (seasonEnd !== null) ) break;
      if ( season.monthStart === month.ordinal ) seasonStart = days;
      if ( season.monthEnd === month.ordinal ) seasonEnd = days;
      days += components.leapYear ? month.leapDays ?? month.days : month.days;
    }
    if ( seasonEnd < seasonStart ) seasonEnd += calendar.days.daysPerYear;
    if ( day < seasonStart ) day += calendar.days.daysPerYear;
    const seasonPercent = (day - seasonStart) / (seasonEnd - seasonStart);
    let formatter = "Mid";
    if ( seasonPercent <= 0.33 ) formatter = "Early";
    else if ( seasonPercent >= 0.66 ) formatter = "Late";
    return game.i18n.format(`DND5E.CALENDAR.Formatters.ApproximateDate.${formatter}Season`, {
      season: game.i18n.localize(season.name)
    });
  }

  /* -------------------------------------------- */

  /**
   * Format the time to approximate value (e.g. "Dawn", "Noon", "Night").
   * @param {CalendarData} calendar      The configured calendar.
   * @param {TimeComponents} components  Time components to format.
   * @param {object} options             Additional formatting options.
   * @returns {string}                   The returned string format.
   */
  static formatApproximateTime(calendar, components, options) {
    const day = calendar.progressDay(components);
    const night = calendar.progressNight(components);
    let formatter;
    if ( (night > 0.96) && (day < 0.04) ) formatter = "Sunrise";
    else if ( (day > 0.96) && (night < 0.04) ) formatter = "Sunset";
    else if ( (day > 0.45) && (day < 0.55) ) formatter = "Noon";
    else if ( (night > 0.45) && (night < 0.55) ) formatter = "Midnight";
    else if ( (night > 0.84) && (day < 0) ) formatter = "Dawn";
    else if ( (day > 1) && (night < 0.16) ) formatter = "Dusk";
    else if ( (day > 0) && (day < 0.5) ) formatter = "Morning";
    else if ( (day > 0.5) && (day <= 0.85) ) formatter = "Afternoon";
    else if ( (day > 0.85) && (night < 0) ) formatter = "Evening";
    else formatter = "Night";
    return game.i18n.localize(`DND5E.CALENDAR.Formatters.ApproximateTime.${formatter}`);
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
  static formatHoursMinutesSeconds(calendar, components, options) {
    return CalendarData5e.formatLocalized(
      "DND5E.CALENDAR.Formatters.HoursMinutesSeconds.Format", calendar, components, options
    );
  }

  /* -------------------------------------------- */

  /**
   * Format the date using the provided localization key and the default formatting parts.
   * @param {string} localizationKey         Key to use for localization.
   * @param {CalendarData} calendar          The configured calendar.
   * @param {TimeComponents} components   Time components to format.
   * @param {object} options                 Additional formatting options.
   * @returns {string}                       The returned string format.
   */
  static formatLocalized(localizationKey, calendar, components, options) {
    return game.i18n.format(localizationKey, CalendarData5e.dateFormattingParts(calendar, components));
  }

  /* -------------------------------------------- */

  /**
   * Format the date to a value including month and day.
   * @param {CalendarData} calendar      The configured calendar.
   * @param {TimeComponents} components  Time components to format.
   * @param {object} options                 Additional formatting options.
   * @returns {string}                       The returned string format.
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

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Inject additional information into time update.
   * @param {number} worldTime
   * @param {number} deltaTime
   * @param {object} options
   * @param {string} userId
   */
  static onUpdateWorldTime(worldTime, deltaTime, options, userId) {
    const previousTime = game.time.calendar.timeToComponents(game.time.worldTime - deltaTime);
    const previousHour = CalendarData5e.hoursOfDay(previousTime);
    const nowTime = game.time.components;
    const nowHour = CalendarData5e.hoursOfDay(nowTime);
    const passedHour = hour => {
      if ( (previousHour < hour) && (nowHour > hour) ) return 1;
      if ( (previousHour > hour) && (nowHour < hour) ) return -1;
      return 0;
    };

    const days = nowTime.day - previousTime.day;
    foundry.utils.setProperty(options, "dnd5e.deltas", {
      midnights: days,
      middays: days + passedHour(game.time.calendar.days.hoursPerDay / 2),
      sunrises: ("sunrise" in game.time.calendar) ? days + passedHour(game.time.calendar.sunrise(nowTime)) : null,
      sunsets: ("sunset" in game.time.calendar) ? days + passedHour(game.time.calendar.sunset(nowTime)) : null
    });
  }
}
