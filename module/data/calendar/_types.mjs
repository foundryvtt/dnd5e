/**
 * @typedef CalendarFormattingContext
 * @property {string} y     Year number.
 * @property {string} yyyy  Year number with at least 4 digits.
 * @property {string} b     Month abbreviation.
 * @property {string} B     Full month name.
 * @property {string} mm    Month number with at least 2 digits.
 * @property {string} d     Day of month.
 * @property {string} dd    Day of month with at least 2 digits.
 * @property {string} D     Ordinal day of month (e.g. 1st, 2nd).
 * @property {string} j     Day of year with at least 3 digits.
 * @property {string} w     Day number in week.
 * @property {string} H     Hours with at least 2 digits.
 * @property {string} M     Minutes with at least 2 digits.
 * @property {string} S     Seconds with at least 2 digits.
 */

/**
 * @typedef CalendarTimeDeltas
 * @property {number} midnights  Number of times midnight has been passed during a time change.
 * @property {number} middays    Number of times noon has been passed during a time change.
 * @property {number} sunrises   Number of sunrises that occurred during a time change.
 * @property {number} sunsets    Number of sunsets that occurred during a time change.
 */

/**
 * @typedef {CalendarTimeDeltas} TimePassageData
 * @property {number} worldTime  Timecode for world after time as passed.
 * @property {number} deltaTime  Change to the timecode that occurred.
 */

/* -------------------------------------------- */

/**
 * @typedef CalendarConfigHarptosFestival
 * @property {string} name   The full name of the festival.
 * @property {number} month  The ordinal month in which this festival occurs.
 * @property {number} day    The day of the month in which this festival occurs.
 */
