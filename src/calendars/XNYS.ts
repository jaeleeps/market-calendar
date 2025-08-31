import { ExchangeCalendar } from './base'
import { DateTime } from 'luxon'

/**
 * New York Stock Exchange (XNYS) calendar.
 * Market open: 09:30, close: 16:00 (Eastern Time)
 */
export class XNYS extends ExchangeCalendar {
  readonly timezone = 'America/New_York'
  readonly openTime = '09:30'
  readonly closeTime = '16:00'

  /**
   * List of full-day market holidays.
   * @returns Array of DateTime objects
   */
  getHolidays(): DateTime[] {
    return [
      // 2024 holidays
      DateTime.fromISO('2024-01-01'), // New Year's Day
      DateTime.fromISO('2024-07-04'), // Independence Day
      DateTime.fromISO('2024-12-25'), // Christmas
      // 2025 holidays
      DateTime.fromISO('2025-01-01'),
      DateTime.fromISO('2025-07-04'),
      DateTime.fromISO('2025-12-25'),
    ]
  }

  /**
   * Early close dates (typically 13:00) before holidays.
   * @returns Map of ISO date → early close time (e.g. "13:00")
   */
  getEarlyCloses(): Map<string, string> {
    return new Map<string, string>([
      ['2024-12-24', '13:00'], // Christmas Eve
      ['2025-07-03', '13:00'], // Day before Independence Day
    ])
  }
}
