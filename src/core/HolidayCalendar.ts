import { DateTime } from 'luxon'
import { Holiday } from './Holiday'

/**
 * Represents a collection of holidays and provides utility methods to check dates.
 */
export class HolidayCalendar {
  holidays: Holiday[]

  constructor(holidays: Holiday[]) {
    this.holidays = holidays
  }

  /**
   * Returns all holiday dates for a given year.
   * @param year The year to collect holiday dates for
   * @returns Array of DateTime objects representing holidays
   */
  getHolidayDatesForYear(year: number): DateTime[] {
    const dates: DateTime[] = []

    for (const holiday of this.holidays) {
      dates.push(...holiday.getDate(year))
    }

    return dates.sort((a, b) => a.toMillis() - b.toMillis())
  }

  /**
   * Checks if a given date is a holiday.
   * @param date DateTime instance
   * @returns boolean indicating if the date is a holiday
   */
  isHoliday(date: DateTime): boolean {
    const year = date.year
    const holidayDates = this.getHolidayDatesForYear(year)
    return holidayDates.some((d) => d.hasSame(date, 'day'))
  }

  /**
   * Returns holidays within a given date range.
   * @param start Start date (inclusive)
   * @param end End date (inclusive)
   * @returns Array of holiday DateTimes within the range
   */
  getHolidaysInRange(start: DateTime, end: DateTime): DateTime[] {
    const allDates = this.getHolidayDatesForYear(start.year)
    if (start.year !== end.year) {
      allDates.push(...this.getHolidayDatesForYear(end.year))
    }
    return allDates.filter((d) => d >= start && d <= end)
  }
}
