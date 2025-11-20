import CalendarData5e from "./calendar-data.mjs";

/**
 * Extension of the core calendar with support for extra formatters.
 */
export class CalendarGreyhawk extends CalendarData5e {

  /* -------------------------------------------- */
  /*  Formatter Functions                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static formatMonthDay(calendar, components, options) {
    return CalendarGreyhawk.formatLocalized(
      "DND5E.CALENDAR.Greyhawk.Formatters.MonthDay", calendar, components, options
    );
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static formatMonthDayYear(calendar, components, options) {
    return CalendarGreyhawk.formatLocalized(
      "DND5E.CALENDAR.Greyhawk.Formatters.MonthDayYear", calendar, components, options
    );
  }
}

/* -------------------------------------------- */

export const CALENDAR_OF_GREYHAWK = {
  name: "Calendar of Greyhawk",
  years: {
    yearZero: 576,
    firstWeekday: 0
  },
  months: {
    values: [
      {
        name: "DND5E.CALENDAR.Greyhawk.Festival.Needfest",
        ordinal: 1, days: 6 // Days 0–5
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Month.Fireseek",
        ordinal: 1, days: 28 // Days 5–33
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Month.Readying",
        ordinal: 2, days: 28 // Days 33–61
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Month.Coldeven",
        ordinal: 3, days: 28 // Days 61–89
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Festival.Growfest",
        ordinal: 4, days: 6 // Days 89–95
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Month.Planting",
        ordinal: 4, days: 28 // Days 95–123
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Month.Flocktime",
        ordinal: 5, days: 28 // Days 123–151
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Month.Wealsun",
        ordinal: 6, days: 28 // Days 151–179
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Festival.Richfest",
        ordinal: 7, days: 6 // Days 179–185
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Month.Reaping",
        ordinal: 7, days: 28 // Days 185–213
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Month.Godmonth",
        ordinal: 8, days: 28 // Days 213–241
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Month.Harvester",
        ordinal: 9, days: 28 // Days 241–269
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Festival.Brewfest",
        ordinal: 10, days: 6 // Days 269–275
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Month.Patchwall",
        ordinal: 10, days: 28 // Days 275-303
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Month.Readyreat",
        ordinal: 11, days: 28 // Days 303–331
      },
      {
        name: "DND5E.CALENDAR.Greyhawk.Month.Sunsebb",
        ordinal: 12, days: 28 // Days 331–359
      }
    ]
  },
  days: {
    values: [
      { name: "DND5E.CALENDAR.Greyhawk.Day.Starday", ordinal: 1 },
      { name: "DND5E.CALENDAR.Greyhawk.Day.Sunday", ordinal: 2 },
      { name: "DND5E.CALENDAR.Greyhawk.Day.Moonday", ordinal: 3 },
      { name: "DND5E.CALENDAR.Greyhawk.Day.Godsday", ordinal: 4 },
      { name: "DND5E.CALENDAR.Greyhawk.Day.Waterday", ordinal: 5 },
      { name: "DND5E.CALENDAR.Greyhawk.Day.Earthday", ordinal: 6 },
      { name: "DND5E.CALENDAR.Greyhawk.Day.Freeday", ordinal: 7 }
    ],
    daysPerYear: 360,
    hoursPerDay: 24,
    minutesPerHour: 60,
    secondsPerMinute: 60
  },
  seasons: {
    values: [
      { name: "DND5E.CALENDAR.Greyhawk.Season.Spring", dayStart: 48, dayEnd: 137 }, // Readying 15–Flocktime 14
      { name: "DND5E.CALENDAR.Greyhawk.Season.Summer", dayStart: 138, dayEnd: 227 }, // Flocktime 15–Godmonth 14
      { name: "DND5E.CALENDAR.Greyhawk.Season.Fall", dayStart: 228, dayEnd: 317 }, // Godmonth 15–Readyrest 14
      { name: "DND5E.CALENDAR.Greyhawk.Season.Winter", dayStart: 318, dayEnd: 47 } // Readrest 15–Readying 14
    ]
  }
};
