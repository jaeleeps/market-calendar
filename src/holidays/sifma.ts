import { DateTime } from 'luxon'
import { Holiday } from '../core/Holiday'
import {
  easterOffset,
  nearestWorkday,
  plusDays,
  plusOneDay,
  previousWorkday,
  sundayToMonday,
  weekdayOffset,
  weekendToMonday,
} from '../utils/rules'
import { Weekday } from '../utils/constants'

/**
 * Holidays of the SIFMA bond market recommendations.
 *
 * SIFMA publishes a schedule for each of its three regions, and each mixes
 * holidays from more than one country: the UK desk keeps US Memorial Day and
 * the Japanese desk keeps both. Ported from the reference implementation's
 * `holidays/sifma.py`.
 */

/** Read a list of ISO dates as UTC dates. */
const dates = (iso: string[]): DateTime[] =>
  iso.map((d) => DateTime.fromISO(d, { zone: 'utc' }))

/** UKSpringBankAdHoc. */
export const UKSpringBankAdHoc = dates(['2022-06-02'])

/** UKPlatinumJubilee2022. */
export const UKPlatinumJubilee2022 = dates(['2022-06-03'])

export const USNewYearsDay = new Holiday({
  name: 'New Years Day US',
  month: 1,
  day: 1,
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
  observance: sundayToMonday,
})

export const USNewYearsEve2pmEarlyClose = new Holiday({
  name: 'New Years Eve US',
  month: 1,
  day: 1,
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
  observance: previousWorkday,
})

export const MartinLutherKingJr = new Holiday({
  name: 'Dr. Martin Luther King Jr. Day',
  month: 1,
  day: 1,
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const USPresidentsDay = new Holiday({
  name: 'Presidents Day',
  month: 2,
  day: 1,
  startDate: DateTime.utc(1971, 1, 1),
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const GoodFridayThru2020 = new Holiday({
  name: 'Good Friday Thru 2020',
  month: 1,
  day: 1,
  endDate: DateTime.utc(2020, 12, 31),
  observance: easterOffset(-2),
})

export const GoodFridayPotentialPost2020 = new Holiday({
  name: 'Good Friday Potential Post 2020',
  month: 1,
  day: 1,
  startDate: DateTime.utc(2021, 1, 1),
  observance: easterOffset(-2),
})

export const DayBeforeGoodFriday2pmEarlyCloseThru2020 = new Holiday({
  name: 'Day Before Good Friday Thru 2020',
  month: 1,
  day: 1,
  endDate: DateTime.utc(2020, 12, 31),
  observance: easterOffset(-3),
})

export const DayBeforeGoodFridayPotentialPost2020 = new Holiday({
  name: 'Day Before Good Friday Potential Post 2020',
  month: 1,
  day: 1,
  startDate: DateTime.utc(2021, 1, 1),
  observance: easterOffset(-3),
})

export const USMemorialDay = new Holiday({
  name: 'Memorial Day',
  month: 5,
  day: 25,
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const DayBeforeUSMemorialDay2pmEarlyClose = new Holiday({
  name: 'Day Before Memorial Day',
  month: 5,
  day: 25,
  offset: [weekdayOffset(Weekday.MONDAY, 1), plusDays(-3)],
})

export const USJuneteenthAfter2022 = new Holiday({
  name: 'Juneteenth Starting at 2022',
  month: 6,
  day: 19,
  startDate: DateTime.utc(2022, 6, 19),
  observance: nearestWorkday,
})

export const USIndependenceDay = new Holiday({
  name: 'July 4th',
  month: 7,
  day: 4,
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
  observance: nearestWorkday,
})

export const DayBeforeUSIndependenceDay2pmEarlyClose = new Holiday({
  name: 'Day Before Independence Day',
  month: 7,
  day: 4,
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
  observance: previousWorkday,
})

export const ThursdayBeforeUSIndependenceDay2pmEarlyClose = new Holiday({
  name: 'Thursday Before Independence Day',
  month: 7,
  day: 2,
  daysOfWeek: [Weekday.THURSDAY],
})

export const USLaborDay = new Holiday({
  name: 'Labor Day',
  month: 9,
  day: 1,
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const USColumbusDay = new Holiday({
  name: 'Columbus Day',
  month: 10,
  day: 1,
  offset: weekdayOffset(Weekday.MONDAY, 2),
})

export const USVeteransDay = new Holiday({
  name: 'Veterans Day',
  month: 11,
  day: 11,
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
  observance: sundayToMonday,
})

export const USThanksgivingDay = new Holiday({
  name: 'Thanksgiving',
  month: 11,
  day: 1,
  offset: weekdayOffset(Weekday.THURSDAY, 4),
})

export const DayAfterThanksgiving2pmEarlyClose = new Holiday({
  name: 'Black Friday',
  month: 11,
  day: 1,
  offset: [weekdayOffset(Weekday.THURSDAY, 4), plusOneDay],
})

export const Christmas = new Holiday({
  name: 'Christmas',
  month: 12,
  day: 25,
  observance: nearestWorkday,
})

export const ChristmasEve2pmEarlyClose = new Holiday({
  name: 'Christmas Eve',
  month: 12,
  day: 25,
  observance: previousWorkday,
})

export const ChristmasEveThursday2pmEarlyClose = new Holiday({
  name: 'Christmas Eve on Thursday',
  month: 12,
  day: 23,
  daysOfWeek: [Weekday.THURSDAY],
})

export const UKNewYearsDay = new Holiday({
  name: 'New Years Day',
  month: 1,
  day: 1,
  observance: weekendToMonday,
})

export const UKGoodFriday = new Holiday({
  name: 'Good Friday',
  month: 1,
  day: 1,
  observance: easterOffset(-2),
})

export const UKEasterMonday = new Holiday({
  name: 'Easter Monday',
  month: 1,
  day: 1,
  observance: easterOffset(1),
})

export const UKMayDay = new Holiday({
  name: 'May Day',
  month: 5,
  day: 1,
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const UKSummerBank = new Holiday({
  name: 'Summer Bank Holiday',
  month: 8,
  day: 31,
  offset: weekdayOffset(Weekday.MONDAY, -1),
})

export const FridayChristmasEve = new Holiday({
  name: 'Friday Christmas Eve',
  month: 12,
  day: 24,
  daysOfWeek: [Weekday.FRIDAY],
})

export const UKChristmas = new Holiday({
  name: 'Christmas',
  month: 12,
  day: 25,
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
})

export const UKWeekendChristmas = new Holiday({
  name: 'Weekend Christmas',
  month: 12,
  day: 27,
  daysOfWeek: [Weekday.MONDAY, Weekday.TUESDAY],
})

export const UKBoxingDay = new Holiday({
  name: 'Boxing Day',
  month: 12,
  day: 26,
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
})

export const UKWeekendBoxingDay = new Holiday({
  name: 'Weekend Boxing Day',
  month: 12,
  day: 28,
  daysOfWeek: [Weekday.MONDAY, Weekday.TUESDAY],
})
