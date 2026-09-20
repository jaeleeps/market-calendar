import { DateTime, Interval } from 'luxon'

/**
 * Returns an array of DateTimes representing each full day in the range (inclusive).
 * Accepts either ISO string dates or Luxon DateTime instances.
 *
 * @param start - Start of the date range (ISO string or Luxon DateTime)
 * @param end - End of the date range (ISO string or Luxon DateTime)
 * @returns Array of Luxon DateTime instances, one for each day in the range
 *
 * @example
 * eachDay("2023-01-01", "2023-01-03")
 * // => [2023-01-01T00:00:00Z, 2023-01-02T00:00:00Z, 2023-01-03T00:00:00Z]
 */
export function eachDay(
  start: string | DateTime,
  end: string | DateTime,
): DateTime[] {
  const [s, e] = normalizeDateInput(start, end)
  const interval = Interval.fromDateTimes(s.startOf('day'), e.endOf('day'))
  return interval.splitBy({ days: 1 }).map((i) => i.start!)
}

/**
 * Generates an array of DateTimes between two points with a specified step.
 * Similar in spirit to numpy's arange or pandas' date_range.
 *
 * @param start - Start timestamp (Luxon DateTime)
 * @param end - End timestamp (Luxon DateTime)
 * @param step - Step size as an object with days/hours/minutes/seconds
 * @returns Array of Luxon DateTime instances incremented by `step`
 *
 * @example
 * generateRange(DateTime.fromISO("2023-01-01T09:00"), DateTime.fromISO("2023-01-01T10:00"), { minutes: 15 })
 * // => [09:00, 09:15, 09:30, 09:45, 10:00]
 */
export function generateRange(
  start: DateTime,
  end: DateTime,
  step: { days?: number; hours?: number; minutes?: number; seconds?: number },
): DateTime[] {
  const result: DateTime[] = []
  let current = start
  while (current <= end) {
    result.push(current)
    current = current.plus(step)
  }
  return result
}

/**
 * Normalize input values (ISO strings or DateTimes) to DateTime instances.
 *
 * @param start - Start date as ISO string or DateTime
 * @param end - End date as ISO string or DateTime
 * @returns A tuple containing two Luxon DateTime instances: [start, end]
 *
 * @example
 * normalizeDateInput("2023-01-01", DateTime.now())
 * // => [DateTime.fromISO("2023-01-01"), DateTime.now()]
 */
export function normalizeDateInput(
  start: string | DateTime,
  end: string | DateTime,
): [DateTime, DateTime] {
  const s = typeof start === 'string' ? DateTime.fromISO(start) : start
  const e = typeof end === 'string' ? DateTime.fromISO(end) : end
  return [s, e]
}
