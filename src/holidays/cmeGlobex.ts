import { DateTime } from 'luxon'
import { Holiday } from '../core/Holiday'
import {
  easterOffset,
  nearestWorkday,
  plusOneDay,
  sundayToMonday,
  weekdayOffset,
} from '../utils/rules'
import { Weekday } from '../utils/constants'

/**
 * Holidays of the CME Globex products.
 *
 * Globex reworked its holiday schedule in 2022, closing outright for days it
 * had previously traded short and the other way about, so most holidays here
 * come in a pre-2022 and a from-2022 form. Ported from the reference
 * implementation's `holidays/cme_globex.py`.
 */

export const USNewYearsDay = new Holiday({
  name: 'New Years Day',
  month: 1,
  day: 1,
  startDate: DateTime.utc(1952, 9, 29),
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
  observance: sundayToMonday,
})

export const USMartinLutherKingJrFrom2022 = new Holiday({
  name: 'Dr. Martin Luther King Jr. Day',
  month: 1,
  day: 1,
  startDate: DateTime.utc(2022, 1, 1),
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ],
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const USMartinLutherKingJrPre2022 = new Holiday({
  name: 'Dr. Martin Luther King Jr. Day',
  month: 1,
  day: 1,
  startDate: DateTime.utc(1998, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const USPresidentsDayFrom2022 = new Holiday({
  name: 'Presidents Day',
  month: 2,
  day: 1,
  startDate: DateTime.utc(2022, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const USPresidentsDayPre2022 = new Holiday({
  name: 'Presidents Day',
  month: 2,
  day: 1,
  endDate: DateTime.utc(2021, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const GoodFriday = new Holiday({
  name: 'Good Friday 1908+',
  month: 1,
  day: 1,
  startDate: DateTime.utc(1908, 1, 1),
  observance: easterOffset(-2),
})

export const USMemorialDayFrom2022 = new Holiday({
  name: 'Memorial Day',
  month: 5,
  day: 25,
  startDate: DateTime.utc(2022, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const USMemorialDayPre2022 = new Holiday({
  name: 'Memorial Day',
  month: 5,
  day: 25,
  endDate: DateTime.utc(2021, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const USJuneteenthFrom2022 = new Holiday({
  name: 'Juneteenth Starting at 2022',
  month: 6,
  day: 19,
  startDate: DateTime.utc(2022, 6, 19),
  observance: nearestWorkday,
})

export const USIndependenceDayFrom2022 = new Holiday({
  name: 'July 4th',
  month: 7,
  day: 4,
  startDate: DateTime.utc(2022, 1, 1),
  observance: nearestWorkday,
})

export const USIndependenceDayPre2022 = new Holiday({
  name: 'July 4th',
  month: 7,
  day: 4,
  endDate: DateTime.utc(2021, 12, 31),
  observance: nearestWorkday,
})

export const USLaborDayFrom2022 = new Holiday({
  name: 'Labor Day',
  month: 9,
  day: 1,
  startDate: DateTime.utc(2022, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const USLaborDayPre2022 = new Holiday({
  name: 'Labor Day',
  month: 9,
  day: 1,
  endDate: DateTime.utc(2021, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const USLaborDay = new Holiday({
  name: 'Labor Day',
  month: 9,
  day: 1,
  startDate: DateTime.utc(1887, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const USThanksgivingDayFrom2022 = new Holiday({
  name: 'Thanksgiving',
  month: 11,
  day: 1,
  startDate: DateTime.utc(2022, 1, 1),
  offset: weekdayOffset(Weekday.THURSDAY, 4),
})

export const USThanksgivingDayPre2022 = new Holiday({
  name: 'Thanksgiving',
  month: 11,
  day: 1,
  endDate: DateTime.utc(2021, 12, 31),
  offset: weekdayOffset(Weekday.THURSDAY, 4),
})

export const FridayAfterThanksgiving = new Holiday({
  name: 'Friday after Thanksgiving',
  month: 11,
  day: 1,
  offset: [weekdayOffset(Weekday.THURSDAY, 4), plusOneDay],
})

export const USThanksgivingFridayFrom2021 = new Holiday({
  name: 'Thanksgiving Friday',
  month: 11,
  day: 1,
  startDate: DateTime.utc(2021, 1, 1),
  offset: [weekdayOffset(Weekday.THURSDAY, 4), plusOneDay],
})

export const USThanksgivingFridayPre2021 = new Holiday({
  name: 'Thanksgiving Friday',
  month: 11,
  day: 1,
  endDate: DateTime.utc(2020, 12, 31),
  offset: [weekdayOffset(Weekday.THURSDAY, 4), plusOneDay],
})

export const ChristmasCME = new Holiday({
  name: 'Christmas',
  month: 12,
  day: 25,
  startDate: DateTime.utc(1999, 1, 1),
  observance: nearestWorkday,
})
