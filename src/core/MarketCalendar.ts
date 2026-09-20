import { DateTime } from 'luxon'
import { HolidayCalendar } from './HolidayCalendar'
import { ProtectedDict } from './classRegistry'
import { Weekday } from '../utils/constants'
import { eachDay } from '../utils/days'
import { MarketDaySchedule, MarketSchedule } from '../utils/types'
import { Dated, latestValue, valueOn } from '../utils/dated'

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

/** A market time given either as a single time or as a dated history. */
export type MarketTimeSpec = TimeOfDay | Dated<TimeOfDay>[]

/** Accept a bare time as a history that has always been in effect. */
function toHistory(time: MarketTimeSpec): Dated<TimeOfDay>[] {
  return Array.isArray(time) && typeof time[0] === 'number'
    ? [{ from: null, value: time as TimeOfDay }]
    : (time as Dated<TimeOfDay>[])
}

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

  /**
   * Regular market times, keyed by column name. Each entry is the history of
   * that time, so an exchange that moved its open records both.
   */
  regularMarketTimes = new ProtectedDict<Dated<TimeOfDay>[]>([
    ['market_open', [{ from: null, value: [9, 30] }]],
    ['market_close', [{ from: null, value: [16, 0] }]],
  ])

  /**
   * Weekdays the exchange trades, as a history. Exchanges that dropped a
   * trading day record both eras rather than only the current one.
   */
  weekmask: Dated<Weekday[]>[] = [
    {
      from: null,
      value: [
        Weekday.MONDAY,
        Weekday.TUESDAY,
        Weekday.WEDNESDAY,
        Weekday.THURSDAY,
        Weekday.FRIDAY,
      ],
    },
  ]

  /** Rule-driven full-day closures. */
  regularHolidays: HolidayCalendar = new HolidayCalendar([])

  /** One-off full-day closures that no rule describes. */
  adhocHolidays: DateTime[] = []

  /**
   * Days that observe a time other than the regular one, keyed by the market
   * time column they override.
   *
   * Any column can have them, not just the open and the close: NYSE shortens
   * its post-market session on the days it closes early.
   */
  specialTimes: Partial<Record<MarketTimeKey, SpecialTime[]>> = {}

  /**
   * Replace an existing market time.
   * @param key An already-defined market time column
   * @param time The new wall-clock time
   */
  changeTime(key: MarketTimeKey, time: MarketTimeSpec): void {
    if (!this.regularMarketTimes.has(key)) {
      throw new Error(`"${key}" is not defined; use addTime instead.`)
    }
    this.regularMarketTimes._set(key, toHistory(time))
  }

  /**
   * Define a market time this calendar does not have yet, e.g. `pre`.
   * @param key A market time column that is not yet defined
   * @param time The wall-clock time
   */
  addTime(key: MarketTimeKey, time: MarketTimeSpec): void {
    if (this.regularMarketTimes.has(key)) {
      throw new Error(`"${key}" is already defined; use changeTime instead.`)
    }
    this.regularMarketTimes._set(key, toHistory(time))
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
   * Get the market time currently in effect for a column.
   * @param key The market time column
   * @returns The [hour, minute] tuple, or undefined if not defined
   */
  getTime(key: MarketTimeKey): TimeOfDay | undefined {
    const history = this.regularMarketTimes.get(key)
    return history ? latestValue(history) : undefined
  }

  /**
   * Get the market time a column had on a given date.
   * @param key The market time column
   * @param date The date to resolve against
   * @returns The [hour, minute] tuple, or undefined if not in effect then
   */
  getTimeOn(key: MarketTimeKey, date: DateLike): TimeOfDay | undefined {
    return this.timeOn(key, this.sessionDate(date))
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

    return eachDay(from, to).filter((day) => {
      const iso = day.toISODate()!
      const trading = valueOn(this.weekmask, iso) ?? []
      return trading.includes(day.weekday) && !closed.has(iso)
    })
  }

  /**
   * Market times for every trading day in the range, with special times
   * applied on the dates that observe them.
   *
   * @param start Start date (inclusive)
   * @param end End date (inclusive)
   * @returns One row per trading day
   */
  schedule(start: DateLike, end: DateLike): MarketSchedule {
    const days = this.validDays(start, end)
    const special = this.specialTimeDates(days)

    return days.map((date) => {
      const iso = date.toISODate()!
      const times: Record<string, DateTime> = {}
      for (const name of this.regularMarketTimes.keys()) {
        const key = name as MarketTimeKey
        // A market time the exchange had not introduced yet simply has no
        // column on that day.
        const time = special.get(key)?.get(iso) ?? this.timeOn(key, date)
        if (time) times[key] = this.at(date, time)
      }

      if (!times.market_open || !times.market_close) {
        throw new Error(
          `${this.name} has no market_open/market_close in effect on ${iso}.`,
        )
      }

      return {
        ...times,
        date,
        market_open: times.market_open,
        market_close: times.market_close,
      } satisfies MarketDaySchedule
    })
  }

  /**
   * Whether the market is in regular trading hours at a given instant.
   *
   * A configured lunch break counts as closed; the open and close themselves
   * count as open. Extended-hours columns such as `pre` and `post` are not
   * considered — read them off `schedule()` when you need them.
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
   * Resolve a market time for one session date.
   *
   * Subclasses override this when a time depends on more than where the date
   * falls in the exchange's history, such as a weekday-specific close.
   *
   * @param key The market time column
   * @param date A session date in the exchange timezone
   * @returns The time in effect, or undefined if the column has none that day
   */
  protected timeOn(key: MarketTimeKey, date: DateTime): TimeOfDay | undefined {
    const history = this.regularMarketTimes.get(key)
    return history ? valueOn(history, date.toISODate()!) : undefined
  }

  /**
   * Resolve an input date to midnight on that calendar date in the exchange
   * timezone — the anchor every session comparison is made against.
   */
  protected sessionDate(date: DateLike): DateTime {
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
   * Resolve every special time to the trading dates that observe it, grouped by
   * the column it overrides. Later entries win, so a calendar can layer a
   * specific rule over a broader one.
   */
  private specialTimeDates(
    days: DateTime[],
  ): Map<MarketTimeKey, Map<string, TimeOfDay>> {
    const byColumn = new Map<MarketTimeKey, Map<string, TimeOfDay>>()
    if (days.length === 0) return byColumn

    const sessions = new Set(days.map((day) => day.toISODate()!))
    const from = days[0]
    const to = days[days.length - 1]

    for (const [key, specials] of Object.entries(this.specialTimes)) {
      const observed = new Map<string, TimeOfDay>()

      for (const { time, calendar, adhocDates } of specials ?? []) {
        const dates = [
          ...(calendar ? calendar.getHolidaysInRange(from, to) : []),
          ...(adhocDates ?? []),
        ]
        for (const date of dates) {
          const iso = date.toISODate()
          if (iso && sessions.has(iso)) observed.set(iso, time)
        }
      }

      if (observed.size > 0) byColumn.set(key as MarketTimeKey, observed)
    }

    return byColumn
  }
}
