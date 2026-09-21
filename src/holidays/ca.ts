import { DateTime } from 'luxon'
import { Holiday } from '../core/Holiday'
import { weekdayOffset, weekendToMonday } from '../utils/rules'
import { Weekday } from '../utils/constants'

/**
 * Canadian holidays, as the Toronto exchange observes them.
 *
 * Ported from the rules the reference implementation keeps in its `tsx`
 * calendar module rather than a holidays one.
 */

/** New Year's Day, moved to the Monday when it falls at a weekend. */
export const TSXNewYearsDay = new Holiday({
  name: "New Year's Day",
  month: 1,
  day: 1,
  observance: weekendToMonday,
})

/** Family Day: the third Monday of February, from 2008. */
export const FamilyDay = new Holiday({
  name: 'Family Day',
  month: 2,
  day: 1,
  offset: weekdayOffset(Weekday.MONDAY, 3),
  startDate: DateTime.utc(2008, 1, 1),
})

/** Victoria Day: the Monday on or before 24 May. */
export const VictoriaDay = new Holiday({
  name: 'Victoria Day',
  month: 5,
  day: 24,
  offset: weekdayOffset(Weekday.MONDAY, -1),
})

/** Canada Day, moved to the Monday when it falls at a weekend. */
export const CanadaDay = new Holiday({
  name: 'Canada Day',
  month: 7,
  day: 1,
  observance: weekendToMonday,
})

/** Civic Holiday: the first Monday of August. */
export const CivicHoliday = new Holiday({
  name: 'Civic Holiday',
  month: 8,
  day: 1,
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

/** Labour Day: the first Monday of September. */
export const CanadianLabourDay = new Holiday({
  name: 'Labour Day',
  month: 9,
  day: 1,
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

/** Thanksgiving: the second Monday of October, unlike the US November one. */
export const CanadianThanksgiving = new Holiday({
  name: 'Thanksgiving',
  month: 10,
  day: 1,
  offset: weekdayOffset(Weekday.MONDAY, 2),
})

/** Christmas Day, observed on the date itself. */
export const CanadianChristmas = new Holiday({
  name: 'Christmas',
  month: 12,
  day: 25,
})

/** Christmas Eve closes early from 2010, unless it falls at a weekend. */
export const ChristmasEveEarlyClose2010Onwards = new Holiday({
  name: 'Christmas Eve early close',
  month: 12,
  day: 24,
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
  startDate: DateTime.utc(2010, 1, 1),
})

/** The exchange shut for two days after the attacks of 11 September 2001. */
export const September11Closings2001 = ['2001-09-11', '2001-09-12'].map((d) =>
  DateTime.fromISO(d, { zone: 'utc' }),
)
