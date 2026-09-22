import { DateTime } from 'luxon'
import { Holiday } from '../core/Holiday'
import { weekendToMonday } from '../utils/rules'
import { Weekday } from '../utils/constants'
import { dbf_mapping, maf_mapping, sf_mapping, tsd_mapping } from './cn'

/**
 * The Shanghai exchange's forward-looking holiday guesses.
 *
 * China publishes its holiday arrangement one year at a time, so every known
 * closure is a listed date. These rules only begin once that list runs out,
 * and are the reference implementation's guess at what the pattern will be.
 */

/** The first year not covered by the published closure list. */
const GUESSES_BEGIN = 2027

/**
 * The second day of a holiday run, taken in lieu at the weekend before.
 *
 * China lengthens a holiday by working the neighbouring weekend, so the
 * second day is observed on the Saturday before rather than after.
 */
function secondDayInLieu(dt: DateTime): DateTime {
  if (dt.weekday === Weekday.MONDAY) return dt.minus({ days: 2 })
  if (dt.weekday === Weekday.TUESDAY || dt.weekday === Weekday.WEDNESDAY) {
    return dt.minus({ days: 3 })
  }
  if (dt.weekday === Weekday.THURSDAY) return dt.minus({ days: 5 })
  return dt
}

/** The third day of a run, taken in lieu on the Sunday before. */
function thirdDayInLieu(dt: DateTime): DateTime {
  if (dt.weekday === Weekday.MONDAY) return dt.minus({ days: 1 })
  if (dt.weekday === Weekday.TUESDAY) return dt.minus({ days: 2 })
  if (dt.weekday === Weekday.WEDNESDAY || dt.weekday === Weekday.THURSDAY) {
    return dt.minus({ days: 3 })
  }
  if (dt.weekday === Weekday.FRIDAY) return dt.minus({ days: 5 })
  return dt
}

/**
 * Build an observance that reads a lunar festival's date for the year.
 *
 * @param mapping - The year-to-date table to read
 * @param delta - Days after the festival itself
 * @param then - A further observance to apply, such as taking a day in lieu
 * @returns An observance, which declines a year the table does not cover
 */
const lunisolar =
  (
    mapping: Record<number, string>,
    delta = 0,
    then?: (dt: DateTime) => DateTime,
  ) =>
  (dt: DateTime): DateTime | null => {
    const listed = mapping[dt.year]
    if (!listed) return null

    const date = DateTime.fromISO(listed, { zone: 'utc' }).plus({ days: delta })
    return then ? then(date) : date
  }

/** What the exchange is expected to close for once the list runs out. */
export const SSEForwardHolidays: Holiday[] = [
  new Holiday({
    name: "New Year's Day",
    month: 1,
    day: 1,
    observance: weekendToMonday,
    startDate: DateTime.utc(GUESSES_BEGIN, 1, 1),
  }),
  new Holiday({
    name: "New Year's Day",
    month: 1,
    day: 2,
    observance: secondDayInLieu,
    startDate: DateTime.utc(GUESSES_BEGIN, 1, 2),
  }),
  new Holiday({
    name: "New Year's Day",
    month: 1,
    day: 3,
    observance: thirdDayInLieu,
    startDate: DateTime.utc(GUESSES_BEGIN, 1, 3),
  }),
  new Holiday({
    name: 'Spring Festival',
    month: 1,
    day: 20,
    observance: lunisolar(sf_mapping, -1),
    startDate: DateTime.utc(GUESSES_BEGIN, 1, 20),
  }),
  new Holiday({
    name: 'Spring Festival',
    month: 1,
    day: 21,
    observance: lunisolar(sf_mapping, 0),
    startDate: DateTime.utc(GUESSES_BEGIN, 1, 21),
  }),
  new Holiday({
    name: 'Spring Festival',
    month: 1,
    day: 21,
    observance: lunisolar(sf_mapping, 1),
    startDate: DateTime.utc(GUESSES_BEGIN, 1, 22),
  }),
  new Holiday({
    name: 'Spring Festival',
    month: 1,
    day: 21,
    observance: lunisolar(sf_mapping, 2),
    startDate: DateTime.utc(GUESSES_BEGIN, 1, 23),
  }),
  new Holiday({
    name: 'Spring Festival',
    month: 1,
    day: 21,
    observance: lunisolar(sf_mapping, 3),
    startDate: DateTime.utc(GUESSES_BEGIN, 1, 24),
  }),
  new Holiday({
    name: 'Spring Festival',
    month: 1,
    day: 21,
    observance: lunisolar(sf_mapping, 4),
    startDate: DateTime.utc(GUESSES_BEGIN, 1, 25),
  }),
  new Holiday({
    name: 'Spring Festival',
    month: 1,
    day: 21,
    observance: lunisolar(sf_mapping, 5),
    startDate: DateTime.utc(GUESSES_BEGIN, 1, 26),
  }),
  new Holiday({
    name: 'Labour Day',
    month: 5,
    day: 1,
    observance: weekendToMonday,
    startDate: DateTime.utc(GUESSES_BEGIN, 5, 1),
  }),
  new Holiday({
    name: 'Labour Day',
    month: 5,
    day: 2,
    observance: secondDayInLieu,
    startDate: DateTime.utc(GUESSES_BEGIN, 5, 2),
  }),
  new Holiday({
    name: 'Labour Day',
    month: 5,
    day: 3,
    observance: thirdDayInLieu,
    startDate: DateTime.utc(GUESSES_BEGIN, 5, 3),
  }),
  new Holiday({
    name: 'Tomb-sweeping Day',
    month: 4,
    day: 4,
    observance: lunisolar(tsd_mapping, 0, weekendToMonday),
    startDate: DateTime.utc(GUESSES_BEGIN, 4, 4),
  }),
  new Holiday({
    name: 'Tomb-sweeping Day',
    month: 4,
    day: 5,
    observance: lunisolar(tsd_mapping, 1, secondDayInLieu),
    startDate: DateTime.utc(GUESSES_BEGIN, 4, 4),
  }),
  new Holiday({
    name: 'Tomb-sweeping Day',
    month: 4,
    day: 6,
    observance: lunisolar(tsd_mapping, 2, thirdDayInLieu),
    startDate: DateTime.utc(GUESSES_BEGIN, 4, 4),
  }),
  new Holiday({
    name: 'Dragon Boat Festival',
    month: 5,
    day: 27,
    observance: lunisolar(dbf_mapping, 0, weekendToMonday),
    startDate: DateTime.utc(GUESSES_BEGIN, 5, 27),
  }),
  new Holiday({
    name: 'Dragon Boat Festival',
    month: 5,
    day: 28,
    observance: lunisolar(dbf_mapping, 1, secondDayInLieu),
    startDate: DateTime.utc(GUESSES_BEGIN, 5, 27),
  }),
  new Holiday({
    name: 'Dragon Boat Festival',
    month: 5,
    day: 29,
    observance: lunisolar(dbf_mapping, 2, thirdDayInLieu),
    startDate: DateTime.utc(GUESSES_BEGIN, 5, 27),
  }),
  new Holiday({
    name: 'Mid-autumn Festival',
    month: 9,
    day: 7,
    observance: lunisolar(maf_mapping, 0, weekendToMonday),
    startDate: DateTime.utc(GUESSES_BEGIN, 9, 7),
  }),
  new Holiday({
    name: 'Mid-autumn Festival',
    month: 9,
    day: 8,
    observance: lunisolar(maf_mapping, 1, secondDayInLieu),
    startDate: DateTime.utc(GUESSES_BEGIN, 9, 7),
  }),
  new Holiday({
    name: 'Mid-autumn Festival',
    month: 9,
    day: 9,
    observance: lunisolar(maf_mapping, 2, thirdDayInLieu),
    startDate: DateTime.utc(GUESSES_BEGIN, 9, 7),
  }),
  new Holiday({
    name: 'National Day',
    month: 10,
    day: 1,
    startDate: DateTime.utc(GUESSES_BEGIN, 10, 1),
  }),
  new Holiday({
    name: 'National Day',
    month: 10,
    day: 2,
    startDate: DateTime.utc(GUESSES_BEGIN, 10, 2),
  }),
  new Holiday({
    name: 'National Day',
    month: 10,
    day: 3,
    startDate: DateTime.utc(GUESSES_BEGIN, 10, 3),
  }),
  new Holiday({
    name: 'National Day',
    month: 10,
    day: 4,
    startDate: DateTime.utc(GUESSES_BEGIN, 10, 4),
  }),
  new Holiday({
    name: 'National Day',
    month: 10,
    day: 5,
    startDate: DateTime.utc(GUESSES_BEGIN, 10, 5),
  }),
  new Holiday({
    name: 'National Day',
    month: 10,
    day: 6,
    startDate: DateTime.utc(GUESSES_BEGIN, 10, 6),
  }),
  new Holiday({
    name: 'National Day',
    month: 10,
    day: 7,
    startDate: DateTime.utc(GUESSES_BEGIN, 10, 7),
  }),
]
