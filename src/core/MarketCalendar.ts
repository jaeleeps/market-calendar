import { DateTime } from 'luxon'
import { HolidayCalendar } from './HolidayCalendar'
import { ProtectedDict } from './classRegistry'
import { Weekday } from '../utils/constants'
import { dateRange } from '../utils/dateRange'
import { MarketDaySchedule, MarketSchedule } from '../utils/types'

/** A wall-clock time in the exchange's timezone, as [hour, minute]. */
export type TimeOfDay = [hour: number, minute: number]

/**
 * Column names of the market times a calendar can publish. `market_open` and
 * `market_close` are always present; the rest are opt-in per exchange.
 */
export type MarketTimeKey =
  | 'pre'
  | 'market_open'
  | 'break_start'
  | 'break_end'
  | 'market_close'
  | 'post'

/** The two market times every calendar must define. */
const REQUIRED_MARKET_TIMES: MarketTimeKey[] = ['market_open', 'market_close']

/**
 * A recurring deviation from the regular open or close, such as the 1:00pm
 * close on the Friday after Thanksgiving.
 */
export interface SpecialTime {
  /** The time observed on the matching dates. */
  time: TimeOfDay
  /** Rule-driven dates the special time applies to. */
  calendar?: HolidayCalendar
  /** One-off dates the special time applies to. */
  adhocDates?: DateTime[]
}

/** A date expressed either as an ISO string or a Luxon DateTime. */
export type DateLike = string | DateTime

/**
 * Base class for exchange calendars.
 *
 * A calendar owns two invariants: which calendar dates are trading sessions,
 * and what wall-clock times those sessions run in the exchange's timezone.
 * Everything else (session labelling, resampling) is derived from the schedule.
 */
export abstract class MarketCalendar {
  /** Alternative names this calendar is registered under. */
  static aliases: string[] = []

  /** Canonical calendar name, e.g. "NYSE". */
  abstract readonly name: string

  /** IANA timezone of the exchange, e.g. "America/New_York". */
  abstract readonly tz: string

  /** Regular market times, keyed by column name. */
  readonly regularMarketTimes = new ProtectedDict<TimeOfDay>([
    ['market_open', [9, 30]],
    ['market_close', [16, 0]],
  ])

  /** Rule-driven full-day closures. */
  regularHolidays: HolidayCalendar = new HolidayCalendar([])

  /** One-off full-day closures that no rule describes. */
  adhocHolidays: DateTime[] = []

  /** Days that open later or earlier than usual. */
  specialOpens: SpecialTime[] = []

  /** Days that close earlier or later than usual. */
  specialCloses: SpecialTime[] = []

  /**
   * Replace an existing market time.
   * @param key An already-defined market time column
   * @param time The new wall-clock time
   */
  changeTime(key: MarketTimeKey, time: TimeOfDay): void {
    if (!this.regularMarketTimes.has(key)) {
      throw new Error(`"${key}" is not defined; use addTime instead.`)
    }
    this.regularMarketTimes._set(key, time)
  }

  /**
   * Define a market time this calendar does not have yet, e.g. `pre`.
   * @param key A market time column that is not yet defined
   * @param time The wall-clock time
   */
  addTime(key: MarketTimeKey, time: TimeOfDay): void {
    if (this.regularMarketTimes.has(key)) {
      throw new Error(`"${key}" is already defined; use changeTime instead.`)
    }
    this.regularMarketTimes._set(key, time)
  }

  /**
   * Remove an optional market time.
   * @param key A market time column other than `market_open`/`market_close`
   */
  removeTime(key: MarketTimeKey): void {
    if (REQUIRED_MARKET_TIMES.includes(key)) {
      throw new Error(`"${key}" is required and cannot be removed.`)
    }
    this.regularMarketTimes._del(key)
  }

  /**
   * Get the wall-clock time configured for a market time column.
   * @param key The market time column
   * @returns The [hour, minute] tuple, or undefined if not defined
   */
  getTime(key: MarketTimeKey): TimeOfDay | undefined {
    return this.regularMarketTimes.get(key)
  }

  /**
   * Full-day closures observed between two dates (inclusive), rules and adhoc.
   *
   * @param start Start date (inclusive)
   * @param end End date (inclusive)
   * @returns Closure dates in the exchange timezone, sorted ascending
   */
  holidays(start: DateLike, end: DateLike): DateTime[] {
    const from = this.sessionDate(start)
    const to = this.sessionDate(end)

    return [...this.holidayDates(from, to)]
      .sort()
      .map((iso) => DateTime.fromISO(iso, { zone: this.tz }))
  }

  /**
   * Trading days between two dates (inclusive): weekdays that are not closures.
   *
   * @param start Start date (inclusive)
   * @param end End date (inclusive)
   * @returns Session dates at midnight in the exchange timezone
   */
  validDays(start: DateLike, end: DateLike): DateTime[] {
    const from = this.sessionDate(start)
    const to = this.sessionDate(end)
    const closed = this.holidayDates(from, to)

    return dateRange(from, to).filter(
      (day) => day.weekday <= Weekday.FRIDAY && !closed.has(day.toISODate()!),
    )
  }

  /**
   * Market times for every trading day in the range, with special opens and
   * closes applied on the dates that observe them.
   *
   * @param start Start date (inclusive)
   * @param end End date (inclusive)
   * @returns One row per trading day
   */
  schedule(start: DateLike, end: DateLike): MarketSchedule {
    const days = this.validDays(start, end)
    const opens = this.specialTimes(this.specialOpens, days)
    const closes = this.specialTimes(this.specialCloses, days)

    return days.map((date) => {
      const iso = date.toISODate()!
      const times: Record<string, DateTime> = {}
      for (const [key, time] of this.regularMarketTimes) {
        times[key] = this.at(date, time)
      }

      const open = opens.get(iso)
      if (open) times.market_open = this.at(date, open)
      const close = closes.get(iso)
      if (close) times.market_close = this.at(date, close)

      return {
        ...times,
        date,
        market_open: times.market_open,
        market_close: times.market_close,
      } satisfies MarketDaySchedule
    })
  }

  /**
   * Whether the market is trading at a given instant.
   *
   * A configured lunch break counts as closed; the open and close themselves
   * count as open.
   *
   * @param dt The instant to test
   * @returns true when `dt` falls inside that day's trading hours
   */
  openAtTime(dt: DateTime): boolean {
    const local = dt.setZone(this.tz)
    const [day] = this.schedule(local, local)
    if (!day) return false

    if (local < day.market_open || local > day.market_close) return false

    const { break_start: breakStart, break_end: breakEnd } = day
    return !(breakStart && breakEnd && local > breakStart && local < breakEnd)
  }

  /**
   * Resolve an input date to midnight on that calendar date in the exchange
   * timezone — the anchor every session comparison is made against.
   */
  private sessionDate(date: DateLike): DateTime {
    const dt =
      typeof date === 'string'
        ? DateTime.fromISO(date, { zone: this.tz })
        : date.setZone(this.tz)

    if (!dt.isValid) throw new Error(`Invalid date: ${String(date)}`)
    return dt.startOf('day')
  }

  /** Apply a wall-clock time to a session date. */
  private at(date: DateTime, [hour, minute]: TimeOfDay): DateTime {
    return date.set({ hour, minute, second: 0, millisecond: 0 })
  }

  /** ISO dates of every full-day closure in the range. */
  private holidayDates(from: DateTime, to: DateTime): Set<string> {
    const closed = new Set<string>()
    const start = from.toISODate()!
    const end = to.toISODate()!

    for (const date of this.regularHolidays.getHolidaysInRange(from, to)) {
      closed.add(date.toISODate()!)
    }
    for (const date of this.adhocHolidays) {
      const iso = date.toISODate()
      if (iso && iso >= start && iso <= end) closed.add(iso)
    }

    return closed
  }

  /**
   * Map trading dates to the special time they observe. Later entries win, so a
   * calendar can layer a specific rule over a broader one.
   */
  private specialTimes(
    specials: SpecialTime[],
    days: DateTime[],
  ): Map<string, TimeOfDay> {
    const observed = new Map<string, TimeOfDay>()
    if (specials.length === 0 || days.length === 0) return observed

    const sessions = new Set(days.map((day) => day.toISODate()!))
    const from = days[0]
    const to = days[days.length - 1]

    for (const { time, calendar, adhocDates } of specials) {
      const dates = [
        ...(calendar ? calendar.getHolidaysInRange(from, to) : []),
        ...(adhocDates ?? []),
      ]
      for (const date of dates) {
        const iso = date.toISODate()
        if (iso && sessions.has(iso)) observed.set(iso, time)
      }
    }

    return observed
  }
}
