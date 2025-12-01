import CalendarData5e from "./calendar-data.mjs";

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { CalendarConfigHarptosFestival } from "./_types.mjs";
 */

/**
 * Extension of the core calendar with support for festivals days and extra formatters.
 */
export class CalendarHarptos extends CalendarData5e {
  /** @inheritDoc */
  static defineSchema() {
    const schema = super.defineSchema();
    return {
      ...schema,
      festivals: new ArrayField(new SchemaField({
        name: new StringField({ required: true }),
        month: new NumberField({ required: true, nullable: false, min: 1, integer: true }),
        day: new NumberField({ required: true, nullable: false, min: 1, integer: true })
      }))
    };
  }

  /* -------------------------------------------- */
  /*  Calendar Helper Methods                     */
  /* -------------------------------------------- */

  /**
   * Find festival day for current day.
   * @param {number|Components} [time]      Time to use when finding festival day, by default the current world time.
   * @returns {CalendarConfigHarptosFestival|null}
   */
  findFestivalDay(time=game.time.worldTime) {
    const components = typeof time === "number" ? this.timeToComponents(time) : time;
    return this.festivals
      .find(f => f.month === (components.month + 1) && f.day === (components.dayOfMonth + 1)) ?? null;
  }

  /* -------------------------------------------- */
  /*  Formatter Functions                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static formatMonthDay(calendar, components, options) {
    const festivalDay = calendar.findFestivalDay(components);
    return festivalDay ? game.i18n.localize(festivalDay.name) : CalendarHarptos.formatLocalized(
      "DND5E.CALENDAR.Harptos.Formatters.DayMonth", calendar, components, options
    );
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static formatMonthDayYear(calendar, components, options) {
    const festivalDay = calendar.findFestivalDay(components);
    if ( festivalDay ) {
      const context = CalendarData5e.dateFormattingParts(calendar, components);
      context.day = game.i18n.localize(festivalDay.name);
      return game.i18n.format("DND5E.CALENDAR.Harptos.Formatters.FestivalDayYear", context);
    }
    return CalendarHarptos.formatLocalized(
      "DND5E.CALENDAR.Harptos.Formatters.DayMonthYear", calendar, components, options
    );
  }
}

/* -------------------------------------------- */

export const CALENDAR_OF_HARPTOS = {
  name: "Calendar of Harptos",
  years: {
    yearZero: 1501,
    firstWeekday: 0,
    leapYear: {
      leapStart: 0,
      leapInterval: 4
    }
  },
  months: {
    values: [
      {
        name: "DND5E.CALENDAR.Harptos.Month.Hammer", abbreviation: "DND5E.CALENDAR.Harptos.Month.HammerCommon",
        ordinal: 1, days: 31 // Days: 0–30
      },
      {
        name: "DND5E.CALENDAR.Harptos.Month.Alturiak", abbreviation: "DND5E.CALENDAR.Harptos.Month.AlturiakCommon",
        ordinal: 2, days: 30 // Days: 30–60
      },
      {
        name: "DND5E.CALENDAR.Harptos.Month.Ches", abbreviation: "DND5E.CALENDAR.Harptos.Month.ChesCommon",
        ordinal: 3, days: 30 // Days: 60–90
      },
      {
        name: "DND5E.CALENDAR.Harptos.Month.Tarsakh", abbreviation: "DND5E.CALENDAR.Harptos.Month.TarsakhCommon",
        ordinal: 4, days: 31 // Days: 91–122
      },
      {
        name: "DND5E.CALENDAR.Harptos.Month.Mirtul", abbreviation: "DND5E.CALENDAR.Harptos.Month.MirtulCommon",
        ordinal: 5, days: 30 // Days: 122–152
      },
      {
        name: "DND5E.CALENDAR.Harptos.Month.Kythorn", abbreviation: "DND5E.CALENDAR.Harptos.Month.KythornCommon",
        ordinal: 6, days: 30 // Days: 152–182
      },
      {
        name: "DND5E.CALENDAR.Harptos.Month.Flamerule", abbreviation: "DND5E.CALENDAR.Harptos.Month.FlameruleCommon",
        ordinal: 7, days: 31, leapDays: 32 // Days: 182–213
      },
      {
        name: "DND5E.CALENDAR.Harptos.Month.Eleasis", abbreviation: "DND5E.CALENDAR.Harptos.Month.EleasisCommon",
        ordinal: 8, days: 30 // Days: 213–243
      },
      {
        name: "DND5E.CALENDAR.Harptos.Month.Eleint", abbreviation: "DND5E.CALENDAR.Harptos.Month.EleintCommon",
        ordinal: 9, days: 31 // Days: 243–273
      },
      {
        name: "DND5E.CALENDAR.Harptos.Month.Marpenoth", abbreviation: "DND5E.CALENDAR.Harptos.Month.MarpenothCommon",
        ordinal: 10, days: 30 // Days: 273–303
      },
      {
        name: "DND5E.CALENDAR.Harptos.Month.Uktar", abbreviation: "DND5E.CALENDAR.Harptos.Month.UktarCommon",
        ordinal: 11, days: 31 // Days: 303–334
      },
      {
        name: "DND5E.CALENDAR.Harptos.Month.Nightal", abbreviation: "DND5E.CALENDAR.Harptos.Month.NightalCommon",
        ordinal: 12, days: 30 // Days: 334–364
      }
    ]
  },
  days: {
    values: [
      { name: "DND5E.CALENDAR.Harptos.Day.One", ordinal: 1 },
      { name: "DND5E.CALENDAR.Harptos.Day.Two", ordinal: 2 },
      { name: "DND5E.CALENDAR.Harptos.Day.Three", ordinal: 3 },
      { name: "DND5E.CALENDAR.Harptos.Day.Four", ordinal: 4 },
      { name: "DND5E.CALENDAR.Harptos.Day.Five", ordinal: 5 },
      { name: "DND5E.CALENDAR.Harptos.Day.Six", ordinal: 6 },
      { name: "DND5E.CALENDAR.Harptos.Day.Seven", ordinal: 7 },
      { name: "DND5E.CALENDAR.Harptos.Day.Eight", ordinal: 8 },
      { name: "DND5E.CALENDAR.Harptos.Day.Nine", ordinal: 9 },
      { name: "DND5E.CALENDAR.Harptos.Day.Ten", ordinal: 10 }
    ],
    daysPerYear: 365,
    hoursPerDay: 24,
    minutesPerHour: 60,
    secondsPerMinute: 60
  },
  festivals: [
    { name: "DND5E.CALENDAR.Harptos.Festival.Midwinter", month: 1, day: 31 },
    { name: "DND5E.CALENDAR.Harptos.Festival.Greengrass", month: 4, day: 31 },
    { name: "DND5E.CALENDAR.Harptos.Festival.Midsummer", month: 7, day: 31 },
    { name: "DND5E.CALENDAR.Harptos.Festival.Shieldmeet", month: 7, day: 32 },
    { name: "DND5E.CALENDAR.Harptos.Festival.Highharvestide", month: 9, day: 31 },
    { name: "DND5E.CALENDAR.Harptos.Festival.FeastOfTheMoon", month: 11, day: 31 }
  ],
  seasons: {
    values: [
      { name: "DND5E.CALENDAR.Harptos.Season.Spring", dayStart: 79, dayEnd: 171 }, // 19 Ches–19 Kythorn
      { name: "DND5E.CALENDAR.Harptos.Season.Summer", dayStart: 172, dayEnd: 263 }, // 20 Kythorn–20 Eleint
      { name: "DND5E.CALENDAR.Harptos.Season.Fall", dayStart: 264, dayEnd: 353 }, // 21 Eleint–19 Uktar
      { name: "DND5E.CALENDAR.Harptos.Season.Winter", dayStart: 354, dayEnd: 78 } // 20 Uktar-18 Ches
    ]
  }
};
