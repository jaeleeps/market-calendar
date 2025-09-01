import { DateTime } from 'luxon'

/**
 * Day of the week constants for readability.
 */
export const MONDAY = 1
export const TUESDAY = 2
export const WEDNESDAY = 3
export const THURSDAY = 4
export const FRIDAY = 5

/**
 * Observance rule that moves a holiday from Sunday to the following Monday.
 *
 * @param date - A Luxon DateTime representing the holiday date
 * @returns A new DateTime moved to Monday if the date falls on Sunday
 */
export function sundayToMonday(date: DateTime): DateTime {
  return date.weekday === 7 ? date.plus({ days: 1 }) : date
}

/**
 * Observance rule that moves a holiday to the nearest weekday.
 * - If Saturday: observed on Friday before
 * - If Sunday: observed on Monday after
 * - Else: remains unchanged
 *
 * @param date - A Luxon DateTime representing the holiday date
 * @returns A new DateTime adjusted to the nearest weekday
 */
export function nearestWorkday(date: DateTime): DateTime {
  if (date.weekday === 6) return date.minus({ days: 1 }) // Saturday → Friday
  if (date.weekday === 7) return date.plus({ days: 1 }) // Sunday → Monday
  return date
}

/**
 * Offset to the Nth weekday of the month
 * @param weekday - Luxon weekday number (1 = Monday, 7 = Sunday)
 * @param n - Nth occurrence (e.g., 3 for 3rd Monday)
 * @returns Function that returns the target DateTime
 */
export function weekdayOffset(
  weekday: number,
  n: number,
): (dt: DateTime) => DateTime {
  return (dt: DateTime) => {
    // Start from the first day of the month
    let date = DateTime.utc(dt.year, dt.month, 1)

    // Count how many of this weekday we've seen
    let count = 0
    while (date.month === dt.month) {
      if (date.weekday === weekday) {
        count++
        if (count === n) break
      }
      date = date.plus({ days: 1 })
    }

    return date
  }
}

/**
 * Offset the date by exactly one day forward.
 * @param dt - The original date
 * @returns The next day
 */
export const plusOneDay = (dt: DateTime): DateTime => dt.plus({ days: 1 })
