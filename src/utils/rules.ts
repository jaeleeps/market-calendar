import { DateTime } from 'luxon'
import { Weekday } from './constants'

/**
 * Move Sunday holidays to Monday
 * @param dt DateTime object
 * @returns Adjusted DateTime
 */
export function sundayToMonday(dt: DateTime): DateTime {
  return dt.weekday === Weekday.SUNDAY ? dt.plus({ days: 1 }) : dt
}

/**
 * Move holiday to nearest weekday (Friday if Saturday, Monday if Sunday)
 * @param dt DateTime object
 * @returns Adjusted DateTime
 */
export function nearestWorkday(dt: DateTime): DateTime {
  if (dt.weekday === Weekday.SATURDAY) return dt.minus({ days: 1 })
  if (dt.weekday === Weekday.SUNDAY) return dt.plus({ days: 1 })
  return dt
}

/**
 * Return an offset that rolls a date to the nth occurrence of a weekday,
 * counting from the date itself (pandas `DateOffset(weekday=MO(n))` semantics).
 *
 * A positive `n` rolls forward, a negative `n` rolls backward, and the date
 * itself counts as the first occurrence when it already falls on `weekday`.
 * Anchoring on the date rather than the month is what lets a single rule express
 * both "3rd Monday of January" (anchor Jan 1) and "Monday on or after May 25".
 *
 * @param weekday Weekday enum value
 * @param n Occurrence to roll to; must be non-zero (default is 1)
 * @returns Function that calculates the correct date
 *
 * @example
 * weekdayOffset(Weekday.MONDAY, 3)(DateTime.utc(2024, 1, 1)) // 2024-01-15 (MLK Day)
 * weekdayOffset(Weekday.MONDAY, 1)(DateTime.utc(2024, 5, 25)) // 2024-05-27 (Memorial Day)
 * weekdayOffset(Weekday.THURSDAY, -1)(DateTime.utc(1930, 11, 30)) // 1930-11-27
 */
export function weekdayOffset(weekday: Weekday, n = 1) {
  if (n === 0) {
    throw new Error('weekdayOffset requires a non-zero occurrence count')
  }

  return (dt: DateTime): DateTime => {
    if (n > 0) {
      const daysAhead = (weekday - dt.weekday + 7) % 7
      return dt.plus({ days: daysAhead + (n - 1) * 7 })
    }
    const daysBehind = (dt.weekday - weekday + 7) % 7
    return dt.minus({ days: daysBehind + (-n - 1) * 7 })
  }
}

/**
 * Move a weekend holiday forward to the Monday.
 * @param dt DateTime object
 * @returns Adjusted DateTime
 */
export function weekendToMonday(dt: DateTime): DateTime {
  if (dt.weekday === Weekday.SATURDAY) return dt.plus({ days: 2 })
  if (dt.weekday === Weekday.SUNDAY) return dt.plus({ days: 1 })
  return dt
}

/**
 * Move a weekend holiday back to the Friday before.
 * @param dt DateTime object
 * @returns Adjusted DateTime
 */
export function previousFriday(dt: DateTime): DateTime {
  if (dt.weekday === Weekday.SATURDAY) return dt.minus({ days: 1 })
  if (dt.weekday === Weekday.SUNDAY) return dt.minus({ days: 2 })
  return dt
}

/**
 * The business day before a date.
 *
 * Always steps back at least one day, then keeps going while it lands at a
 * weekend, so the day before a Monday holiday is the Friday.
 *
 * @param dt DateTime object
 * @returns The preceding weekday
 */
export function previousWorkday(dt: DateTime): DateTime {
  let previous = dt.minus({ days: 1 })
  while (previous.weekday > Weekday.FRIDAY)
    previous = previous.minus({ days: 1 })
  return previous
}

/**
 * Move a holiday that follows another one to the next free weekday.
 *
 * Saturday and Sunday both go to the following Tuesday and Monday to the
 * Tuesday, because the Monday belongs to the holiday of the day before.
 *
 * @param dt DateTime object
 * @returns Adjusted DateTime
 */
export function nextMondayOrTuesday(dt: DateTime): DateTime {
  if (dt.weekday === Weekday.SATURDAY || dt.weekday === Weekday.SUNDAY) {
    return dt.plus({ days: 2 })
  }
  return dt.weekday === Weekday.MONDAY ? dt.plus({ days: 1 }) : dt
}

/**
 * Return an observance a fixed number of days from Easter Sunday.
 *
 * Much of Europe hangs its spring holidays off Easter: Maundy Thursday is
 * three days before, Ascension Day thirty-nine after, Whit Monday fifty.
 *
 * @param days Days from Easter Sunday; negative is before
 * @returns An observance resolving to that day of the date's year
 */
export function easterOffset(days: number) {
  return (dt: DateTime): DateTime => easterSunday(dt.year).plus({ days })
}

/**
 * Observance that maps any date in a year to that year's Easter Monday.
 *
 * @param dt Any DateTime in the target year
 * @returns Easter Monday
 */
export function easterMondayObservance(dt: DateTime): DateTime {
  return easterSunday(dt.year).plus({ days: 1 })
}

/**
 * Offset that adds 1 day
 * @param dt DateTime object
 * @returns DateTime + 1 day
 */
export const plusOneDay = (dt: DateTime): DateTime => dt.plus({ days: 1 })

/**
 * Return an offset that shifts a date by a fixed number of days.
 *
 * @param days Days to add; negative moves back
 * @returns The offset function
 */
export const plusDays =
  (days: number) =>
  (dt: DateTime): DateTime =>
    dt.plus({ days })

/**
 * Compute Gregorian Easter Sunday for a year (anonymous Gregorian algorithm).
 *
 * @param year Gregorian year
 * @returns Easter Sunday as a UTC date
 */
export function easterSunday(year: number): DateTime {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const total = h + l - 7 * m + 114

  return DateTime.utc(year, Math.floor(total / 31), (total % 31) + 1)
}

/**
 * Observance that maps any date in a year to that year's Good Friday.
 *
 * @param dt Any DateTime in the target year
 * @returns Good Friday (Easter Sunday minus two days)
 */
export function goodFridayObservance(dt: DateTime): DateTime {
  return easterSunday(dt.year).minus({ days: 2 })
}
