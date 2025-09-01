import { DateTime } from 'luxon'

/**
 * Generate a range of dates (UTC) between two dates, inclusive.
 *
 * @param start - Start of the range (inclusive)
 * @param end - End of the range (inclusive)
 * @returns Array of DateTime objects (at midnight UTC)
 */
export function dateRangeHTF(start: DateTime, end: DateTime): DateTime[] {
  const result: DateTime[] = []
  let current = start.startOf('day')

  while (current <= end.startOf('day')) {
    result.push(current)
    current = current.plus({ days: 1 })
  }

  return result
}
