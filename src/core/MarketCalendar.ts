import { DateTime, Interval } from 'luxon'
import { HolidayCalendar } from './HolidayCalendar'
import { ProtectedDict } from './classRegistry'

/**
 * A mapping from session label to market open/close time.
 */
export interface MarketTime {
  /** Human-readable label for the session (e.g. "market") */
  label: string
  /** Open time as [hour, minute] tuple */
  open: [number, number]
  /** Close time as [hour, minute] tuple */
  close: [number, number]
}

/**
 * Represents a full trading schedule for a range of dates
 */
export interface TradingSession {
  date: DateTime
  open: DateTime
  close: DateTime
}

const defaultMarketTimes: Record<string, MarketTime> = {
  core: {
    label: 'core',
    open: [9, 30],
    close: [16, 0],
  },
  pre: {
    label: 'pre',
    open: [7, 0],
    close: [9, 30],
  },
  post: {
    label: 'post',
    open: [16, 0],
    close: [20, 0],
  },
}

export abstract class MarketCalendar {
  static aliases: string[] = []

  /** Regular trading hours */
  regularMarketTimes: ProtectedDict<MarketTime> = new ProtectedDict(
    Object.entries(defaultMarketTimes),
  )

  /** Holiday calendar */
  abstract regularHolidays: HolidayCalendar

  /** Manually specified holiday dates */
  abstract adhocHolidays: DateTime[]

  /** Special open days (e.g., 11:00AM open) */
  specialOpens: Record<string, MarketTime[]> = {}
  specialOpensAdhoc: Record<string, DateTime[]> = {}

  /** Special close days (e.g., 1:00PM close) */
  specialCloses: Record<string, MarketTime[]> = {}
  specialClosesAdhoc: Record<string, DateTime[]> = {}

  /**
   * Returns valid trading days between start and end
   * @param start ISO date or Luxon DateTime
   * @param end ISO date or Luxon DateTime
   */
  validDays(start: string | DateTime, end: string | DateTime): DateTime[] {
    const startDt = typeof start === 'string' ? DateTime.fromISO(start) : start
    const endDt = typeof end === 'string' ? DateTime.fromISO(end) : end

    const allDays = Interval.fromDateTimes(
      startDt.startOf('day'),
      endDt.endOf('day'),
    ).splitBy({ days: 1 })
    return allDays
      .map((i) => i.start!)
      .filter((day) => {
        const isRegularHoliday = this.regularHolidays.isHoliday(day)
        const isAdhocHoliday = this.adhocHolidays.some((adhoc) =>
          adhoc.hasSame(day, 'day'),
        )
        return !isRegularHoliday && !isAdhocHoliday && day.weekday <= 5
      })
  }

  /**
   * Returns full schedule with open/close for each day in range
   * @param start ISO date or Luxon DateTime
   * @param end ISO date or Luxon DateTime
   */
  schedule(start: string | DateTime, end: string | DateTime): TradingSession[] {
    const days = this.validDays(start, end)
    const market = this.regularMarketTimes.get('market')

    return days.map((date) => {
      const open = date.set({ hour: market!.open[0], minute: market!.open[1] })
      const close = date.set({
        hour: market!.close[0],
        minute: market!.close[1],
      })
      return { date, open, close }
    })
  }

  /**
   * Return registered calendar names (stub for registry pattern)
   */
  static calendarNames(): string[] {
    return Object.keys((this as any)._regmeta_class_registry || {})
  }

  /**
   * Factory method to retrieve calendar by name (stub for registry pattern)
   */
  static factory(name: string): MarketCalendar {
    const registry = (this as any)._regmeta_class_registry || {}
    if (!(name in registry)) {
      throw new Error(`MarketCalendar '${name}' is not registered.`)
    }
    return new registry[name]()
  }

  /**
   * Change the time for a market session label
   * @param label - The key in regularMarketTimes to modify
   * @param newTime - New MarketTime object
   */
  changeTime(label: string, newTime: MarketTime): void {
    this.regularMarketTimes._set(label, newTime)
  }

  /**
   * Get time config for a given label (e.g., "market")
   * @param label - The key to retrieve
   * @returns MarketTime or undefined
   */
  getTime(label: string): MarketTime | undefined {
    return this.regularMarketTimes.get(label)
  }

  /**
   * Returns true if this calendar overrides open/close logic
   */
  isCustom(): boolean {
    return typeof this.openAtTime === 'function'
  }

  /**
   * Check if the market is open at a given time.
   * @param dt - The datetime to check (UTC)
   * @param label - The session label to check (default: 'market')
   * @returns true if open, false otherwise
   */
  openAtTime(dt: DateTime, label: string = 'market'): boolean {
    const time = this.getTime(label)
    if (!time) return false

    const open = dt.set({ hour: time.open[0], minute: time.open[1] })
    const close = dt.set({ hour: time.close[0], minute: time.close[1] })

    return dt >= open && dt <= close
  }
}
