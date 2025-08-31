import { DateTime, Interval } from 'luxon'

/**
 * A single day's market schedule.
 */
export interface MarketSchedule {
  marketOpen: DateTime
  marketClose: DateTime
}

/**
 * Abstract base class for exchange calendars.
 * Concrete calendars must define timezone, open/close times, holidays, and early closes.
 */
export abstract class ExchangeCalendar {
  /**
   * IANA timezone string of the exchange (e.g., "America/New_York").
   */
  abstract readonly timezone: string

  /**
   * Regular market open time in "HH:mm" format (24h).
   */
  abstract readonly openTime: string

  /**
   * Regular market close time in "HH:mm" format (24h).
   */
  abstract readonly closeTime: string

  /**
   * Returns all full-day market holidays as DateTime objects.
   *
   * @returns Array of DateTime representing holiday dates.
   */
  abstract getHolidays(): DateTime[]

  /**
   * Returns a map of early close days.
   *
   * @returns A map where the key is the ISO date (YYYY-MM-DD) and the value is early close time ("HH:mm").
   */
  abstract getEarlyCloses(): Map<string, string>

  /**
   * Returns the trading schedule between two dates (inclusive).
   *
   * @param start - Start date (inclusive)
   * @param end - End date (inclusive)
   * @returns A map of ISO date string → { marketOpen, marketClose }
   */
  getSchedule(start: DateTime, end: DateTime): Map<string, MarketSchedule> {
    const schedule = new Map<string, MarketSchedule>()
    const holidays = new Set(this.getHolidays().map((d) => d.toISODate()))
    const earlyCloses = this.getEarlyCloses()

    let date = start.startOf('day')
    const until = end.startOf('day')

    while (date <= until) {
      const iso = date.toISODate()
      if (!iso || holidays.has(iso)) {
        date = date.plus({ days: 1 })
        continue
      }

      const open = date
        .set(this.#timeParts(this.openTime))
        .setZone(this.timezone)
      const close = earlyCloses.has(iso)
        ? date
            .set(this.#timeParts(earlyCloses.get(iso)!))
            .setZone(this.timezone)
        : date.set(this.#timeParts(this.closeTime)).setZone(this.timezone)

      schedule.set(iso, { marketOpen: open, marketClose: close })
      date = date.plus({ days: 1 })
    }

    return schedule
  }

  /**
   * Returns valid trading days (not holidays) between two dates (inclusive).
   *
   * @param start - Start date (inclusive)
   * @param end - End date (inclusive)
   * @returns Array of DateTime objects representing valid trading days.
   */
  validDays(start: DateTime, end: DateTime): DateTime[] {
    return Array.from(this.getSchedule(start, end).keys()).map((date) =>
      DateTime.fromISO(date, { zone: this.timezone }),
    )
  }

  /**
   * Checks if the market is open at the given timestamp.
   *
   * @param dt - The DateTime to check
   * @returns True if the market is open during that minute; otherwise false.
   */
  isOpenOnMinute(dt: DateTime): boolean {
    const day = dt.toISODate()
    if (!day) return false

    const schedule = this.getSchedule(dt.startOf('day'), dt.startOf('day')).get(
      day,
    )
    if (!schedule) return false

    return Interval.fromDateTimes(
      schedule.marketOpen,
      schedule.marketClose,
    ).contains(dt)
  }

  /**
   * Internal helper to convert "HH:mm" to { hour, minute } object.
   *
   * @param hhmm - Time string in "HH:mm" format
   * @returns Object with hour and minute as numbers
   */
  #timeParts(hhmm: string): { hour: number; minute: number } {
    const [hour, minute] = hhmm.split(':').map(Number)
    return { hour, minute }
  }
}
