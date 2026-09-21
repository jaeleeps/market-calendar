import { DateTime } from 'luxon'
import { Holiday } from '../core/Holiday'
import {
  easterMondayObservance,
  goodFridayObservance,
  previousFriday,
  weekdayOffset,
  weekendToMonday,
} from '../utils/rules'
import { Weekday } from '../utils/constants'

/**
 * UK bank holidays, as the London Stock Exchange observes them.
 *
 * The May and Spring bank holidays are each stated several times over: they
 * were moved for a jubilee or a royal occasion more than once, and each
 * change is a separate rule bounded to its era. Ported from the reference
 * implementation's `holidays/uk.py`.
 */

/** Read a list of ISO dates as UTC dates. */
const dates = (iso: string[]): DateTime[] =>
  iso.map((d) => DateTime.fromISO(d, { zone: 'utc' }))

/** Good Friday, which the LSE closes for. */
export const GoodFriday = new Holiday({
  name: 'Good Friday',
  month: 1,
  day: 1,
  observance: goodFridayObservance,
})

/** Easter Monday, likewise. */
export const EasterMonday = new Holiday({
  name: 'Easter Monday',
  month: 1,
  day: 1,
  observance: easterMondayObservance,
})

/**
 * One-off closures: VE Day anniversaries, the Queen's jubilees and funeral,
 * royal weddings, the coronation of Charles III and the 2012 Olympics.
 */
export const UniqueCloses = dates([
  '1995-05-08', // 50th Anniversary
  '2020-05-08', // 75th Anniversary
  '1977-06-07',
  '2002-06-03',
  '2002-06-04',
  '2012-06-04',
  '2012-06-05',
  '2022-06-02',
  '2022-06-03',
  '2022-09-19',
  '1973-11-14', // Wedding Day of Princess Anne and Mark Phillips
  '1981-07-29', // Wedding Day of Prince Charles and Diana Spencer
  '2011-04-29', // Wedding Day of Prince William and Catherine Middleton
  '2023-05-08',
  '1999-12-31', // Eve of 3rd Millenium A.D.
])

export const LSENewYearsEve = new Holiday({
  name: "New Year's Eve",
  month: 12,
  day: 31,
  observance: previousFriday,
})

export const LSENewYearsDay = new Holiday({
  name: "New Year's Day",
  month: 1,
  day: 1,
  observance: weekendToMonday,
})

export const MayBank_pre_1995 = new Holiday({
  name: 'Early May Bank Holiday',
  month: 5,
  day: 1,
  endDate: DateTime.utc(1994, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const MayBank_post_1995_pre_2020 = new Holiday({
  name: 'Early May Bank Holiday',
  month: 5,
  day: 1,
  startDate: DateTime.utc(1996, 1, 1),
  endDate: DateTime.utc(2019, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const MayBank_post_2020 = new Holiday({
  name: 'Early May Bank Holiday',
  month: 5,
  day: 1,
  startDate: DateTime.utc(2021, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const SpringBank_pre_2002 = new Holiday({
  name: 'Spring Bank Holiday',
  month: 5,
  day: 31,
  endDate: DateTime.utc(2001, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, -1),
})

export const SpringBank_post_2002_pre_2012 = new Holiday({
  name: 'Spring Bank Holiday',
  month: 5,
  day: 31,
  startDate: DateTime.utc(2003, 1, 1),
  endDate: DateTime.utc(2011, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, -1),
})

export const SpringBank_post_2012_pre_2022 = new Holiday({
  name: 'Spring Bank Holiday',
  month: 5,
  day: 31,
  startDate: DateTime.utc(2013, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, -1),
})

/**
 * Spring Bank Holiday from 2023.
 *
 * It starts a year later than the reference implementation has it, which
 * says 2022-01-01. Every other time this holiday moved for a royal occasion
 * — 2002, 2012 and 2020 — the rule resumes the year *after*, leaving the
 * jubilee dates to the one-off closures. 2022 is the one year that does not
 * follow the pattern, and the effect is that 2022-05-30 is reported closed
 * when the holiday had been moved to 2 June.
 *
 * The reference implementation's own test means to catch this: it asserts
 * '2022-05-31' is open, commented "Spring bank holiday removed". That date
 * was a Tuesday and never a bank holiday, so the assertion passes without
 * testing anything.
 */
export const SpringBank_post_2022 = new Holiday({
  name: 'Spring Bank Holiday',
  month: 5,
  day: 31,
  startDate: DateTime.utc(2023, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, -1),
})

export const SummerBank = new Holiday({
  name: 'Summer Bank Holiday',
  month: 8,
  day: 31,
  offset: weekdayOffset(Weekday.MONDAY, -1),
})

export const ChristmasEve = new Holiday({
  name: 'Christmas Eve',
  month: 12,
  day: 24,
  observance: previousFriday,
})

export const Christmas = new Holiday({
  name: 'Christmas',
  month: 12,
  day: 25,
})

export const WeekendChristmas = new Holiday({
  name: 'Weekend Christmas',
  month: 12,
  day: 27,
  daysOfWeek: [Weekday.MONDAY, Weekday.TUESDAY],
})

export const BoxingDay = new Holiday({
  name: 'Boxing Day',
  month: 12,
  day: 26,
})

export const WeekendBoxingDay = new Holiday({
  name: 'Weekend Boxing Day',
  month: 12,
  day: 28,
  daysOfWeek: [Weekday.MONDAY, Weekday.TUESDAY],
})
