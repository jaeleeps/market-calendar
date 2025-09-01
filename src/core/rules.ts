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
 * Return a function to offset date by the nth occurrence of a weekday in a month
 * (e.g., 3rd Monday of February)
 * @param weekday Weekday enum value
 * @param n Number of occurrence (default is 1)
 * @returns Function that calculates the correct date
 */
export function weekdayOffset(weekday: Weekday, n = 1) {
  return (dt: DateTime): DateTime => {
    const firstDay = dt.startOf('month')
    let result = firstDay

    while (result.weekday !== weekday) {
      result = result.plus({ days: 1 })
    }

    return result.plus({ weeks: n - 1 })
  }
}

/**
 * Offset that adds 1 day
 * @param dt DateTime object
 * @returns DateTime + 1 day
 */
export const plusOneDay = (dt: DateTime): DateTime => dt.plus({ days: 1 })
