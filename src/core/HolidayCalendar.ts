import { DateTime } from 'luxon'
import { Holiday } from './Holiday'

/**
 * Represents a collection of holidays and provides utility methods to check dates.
 *
 * Holidays are calendar dates, not instants: every comparison here is made on the
 * ISO date (`YYYY-MM-DD`) so that a rule computed in UTC still matches a session
 * date expressed in an exchange timezone.
 */
export class HolidayCalendar {
  rules: Holiday[]

  /** Memoized per-year rule evaluation; rules are immutable once constructed. */
  private readonly cache = new Map<number, DateTime[]>()

  constructor(holidays: Holiday[]) {
    this.rules = holidays
  }

  /**
   * Returns all holiday dates for a given year.
   * @param year The year to collect holiday dates for
   * @returns Array of DateTime objects representing holidays, sorted ascending
   */
  getHolidayDatesForYear(year: number): DateTime[] {
    const cached = this.cache.get(year)
    if (cached) return cached

    const dates = this.rules
      .flatMap((holiday) => holiday.getDate(year))
      .sort((a, b) => a.toMillis() - b.toMillis())

    this.cache.set(year, dates)
    return dates
  }

  /**
   * Checks if a given date is a holiday.
   * @param date DateTime instance
   * @returns boolean indicating if the date is a holiday
   */
  isHoliday(date: DateTime): boolean {
    const iso = date.toISODate()
    return this.getHolidayDatesForYear(date.year).some(
      (d) => d.toISODate() === iso,
    )
  }

  /**
   * Returns holidays within a given date range.
   * @param start Start date (inclusive)
   * @param end End date (inclusive)
   * @returns Array of holiday DateTimes within the range, sorted ascending
   */
  getHolidaysInRange(start: DateTime, end: DateTime): DateTime[] {
    const from = start.toISODate()
    const to = end.toISODate()
    if (!from || !to || from > to) return []

    const dates: DateTime[] = []
    // A rule anchored to an adjacent year can still observe inside the range
    // (e.g. New Year's Day rolled forward), so widen the scan by a year.
    for (let year = start.year - 1; year <= end.year + 1; year++) {
      for (const date of this.getHolidayDatesForYear(year)) {
        const iso = date.toISODate()
        if (iso && iso >= from && iso <= to) dates.push(date)
      }
    }

    return dates.sort((a, b) => a.toMillis() - b.toMillis())
  }
}
