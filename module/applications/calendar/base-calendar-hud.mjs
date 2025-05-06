import { formatNumber } from "../../utils.mjs";
import Application5e from "../api/application.mjs";

/**
 * Base application that calendar HUDs should inherit from.
 */
export default class BaseCalendarHUD extends Application5e {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    actions: {
      advanceTime: BaseCalendarHUD.#advanceTime
    },
    id: "calendar-hud",
    window: {
      frame: false,
      positioned: false
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Should the calendar HUD be displayed for the current user?
   * @type {boolean}
   */
  static get shouldDisplay() {
    return (game.settings.get("dnd5e", "calendarConfig")?.enabled || false)
      && (game.settings.get("dnd5e", "calendarPreferences")?.visible || false);
  }

  /**
   * Should the calendar HUD be displayed for the current user?
   * @type {boolean}
   */
  get shouldDisplay() {
    return this.constructor.shouldDisplay;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async render(options) {
    if ( this.rendered || this.shouldDisplay ) await super.render(options);
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onFirstRender(context, options) {
    this._placeHUD();
    await super._onFirstRender(context, options);
  }

  /* -------------------------------------------- */

  /**
   * Place the HUD application in the middle-top UI section.
   * @protected
   */
  _placeHUD() {
    const location = document.querySelector("#ui-middle #ui-top");
    location.append(this.element);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle moving between set amounts of time.
   * @this {BaseCalendarHUD}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #advanceTime(event, target) {
    const config = game.settings.get("dnd5e", "calendarConfig").buttons[target.dataset.amount];
    game.time.advance({
      [config.units]: target.dataset.amount.startsWith("reverse") ? -config.value : config.value
    });
  }

  /* -------------------------------------------- */

  /**
   * Respond to changes in the calendar settings.
   */
  onUpdateSettings() {
    if ( this.shouldDisplay ) this.render({ force: true });
    else if ( this.rendered ) this.close({ animate: false });
  }

  /* -------------------------------------------- */

  /**
   * Respond to changes in the world time.
   * @param {number} worldTime
   * @param {number} deltaTime
   * @param {object} options
   * @param {string} userId
   */
  static onUpdateWorldTime(worldTime, deltaTime, options, userId) {
    if ( this.shouldDisplay ) CONFIG.DND5E.calendar.instance?.render();
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
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
   * Format the date using the provided localization key and the default formatting parts.
   * @param {string} localizationKey     Key to use for localization.
   * @param {CalendarData} calendar      The configured calendar.
   * @param {TimeComponents} components  Time components to format.
   * @param {object} options             Additional formatting options.
   * @returns {string}                   The returned string format.
   */
  static simpleFormat(localizationKey, calendar, components, options) {
    return game.i18n.format(localizationKey, BaseCalendarHUD.dateFormattingParts(calendar, components));
  }

  /* -------------------------------------------- */

  /**
   * Progress between sunrise and sunset assuming it is daylight half the day duration.
   * @type {CalendarProgress}
   */
  static simpleProgressDay(time) {
    const daylightHours = time.calendar.days.hoursPerDay / 2;
    return (time.components.hour - (daylightHours / 2)) / daylightHours;
  }

  /* -------------------------------------------- */

  /**
   * Progress between sunset and sunrise assuming it is night half the day duration.
   * @type {CalendarProgress}
   */
  static simpleProgressNight(time) {
    const daylightHours = time.calendar.days.hoursPerDay / 2;
    let hour = time.components.hour;
    if ( time.components.hour < daylightHours ) hour += time.calendar.days.hoursPerDay;
    return (hour - (daylightHours * 1.5)) / daylightHours;
  }
}
