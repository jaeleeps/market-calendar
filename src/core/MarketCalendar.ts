import { DateTime } from 'luxon'
import { HolidayCalendar } from './HolidayCalendar'
import { ProtectedDict } from './classRegistry'
import { Weekday } from '../utils/constants'
import { eachDay } from '../utils/days'
import { MarketDaySchedule, MarketSchedule } from '../utils/types'
import { Dated, latestValue, valueOn } from '../utils/dated'

/**
 * A wall-clock time in the exchange's timezone.
 *
 * The optional third element shifts the time off the session date, which is
 * how a session that opens the evening before its trade date is expressed:
 * `[17, 0, -1]` is 17:00 on the previous calendar day.
 */
export type TimeOfDay = [hour: number, minute: number, dayOffset?: number]

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

/** Market times in the order they occur during a trading day. */
const MARKET_TIME_ORDER: MarketTimeKey[] = [
  'pre',
  'market_open',
  'break_start',
  'break_end',
  'market_close',
  'post',
]

/** Whether reaching each market time opens the market or closes it. */
const OPENS_MARKET: Record<MarketTimeKey, boolean> = {
  pre: true,
  market_open: true,
  break_start: false,
  break_end: true,
  market_close: false,
  post: false,
}

/** An instant at which the market opens or closes. */
interface MarketEvent {
  at: DateTime
  opens: boolean
}

/** Options for building a schedule. */
export interface ScheduleOptions {
  /** Timezone for the market times. Defaults to the exchange's own. */
  tz?: string
  /**
   * Which market times to publish, or 'all'. Defaults to every one the
   * calendar defines; `market_open` and `market_close` are always required.
   */
  marketTimes?: MarketTimeKey[] | 'all'
  /**
   * How a special open or close affects the other columns: true conforms
   * them to it, false leaves them alone, null ignores special times
   * altogether. Defaults to true.
   */
  forceSpecialTimes?: boolean | null
}

/** Options for asking whether the market is open. */
export interface OpenAtTimeOptions {
  /**
   * Count the instant the market shuts as open, for callers labelling bars by
   * their closing edge. Defaults to false.
   */
  includeClose?: boolean
  /**
   * Ignore the pre and post sessions and ask only about regular hours.
   * Defaults to false.
   */
  onlyRTH?: boolean
}

/**
 * A market time given either as a single time or as a dated history.
 *
 * An entry whose value is null discontinues the market time from that date:
 * the column stops appearing in the schedule.
 */
export type MarketTimeSpec = TimeOfDay | Dated<TimeOfDay | null>[]

/** Accept a bare time as a history that has always been in effect. */
function toHistory(time: MarketTimeSpec): Dated<TimeOfDay | null>[] {
  return Array.isArray(time) && typeof time[0] === 'number'
    ? [{ from: null, value: time as TimeOfDay }]
    : (time as Dated<TimeOfDay | null>[])
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
  regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
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
    return (history ? latestValue(history) : undefined) ?? undefined
  }

  /**
   * Whether a market time the calendar once had has since been discontinued.
   *
   * @param key The market time column
   * @returns true when the column existed and no longer does
   */
  isDiscontinued(key: MarketTimeKey): boolean {
    const history = this.regularMarketTimes.get(key)
    return history !== undefined && latestValue(history) === null
  }

  /** Whether any market time has been discontinued. */
  get hasDiscontinued(): boolean {
    return [...this.regularMarketTimes.keys()].some((key) =>
      this.isDiscontinued(key as MarketTimeKey),
    )
  }

  /** Days the open sits away from the session date; negative is the day before. */
  get openOffset(): number {
    return this.getTime('market_open')?.[2] ?? 0
  }

  /** Days the close sits away from the session date. */
  get closeOffset(): number {
    return this.getTime('market_close')?.[2] ?? 0
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
   * @param options Timezone, columns, and how special times apply
   * @returns One row per trading day
   */
  schedule(
    start: DateLike,
    end: DateLike,
    options: ScheduleOptions = {},
  ): MarketSchedule {
    return this.scheduleFromDays(this.validDays(start, end), options)
  }

  /**
   * Market times for a given list of trading days.
   *
   * The days are taken as given: nothing checks them against the holiday
   * rules, which is what makes this useful for re-using a set of days that
   * was already worked out.
   *
   * @param days Session dates, as from `validDays()`
   * @param options Timezone, columns, and how special times apply
   * @returns One row per day
   */
  scheduleFromDays(
    days: DateTime[],
    options: ScheduleOptions = {},
  ): MarketSchedule {
    const {
      tz = this.tz,
      marketTimes = 'all',
      forceSpecialTimes = true,
    } = options

    const keys =
      marketTimes === 'all'
        ? ([...this.regularMarketTimes.keys()] as MarketTimeKey[])
        : marketTimes
    for (const required of REQUIRED_MARKET_TIMES) {
      if (!keys.includes(required)) {
        throw new Error(`A schedule must include ${required}.`)
      }
    }

    // Ignoring special times means never looking them up.
    const special =
      forceSpecialTimes === null
        ? new Map<MarketTimeKey, Map<string, TimeOfDay>>()
        : this.specialTimeDates(days)

    return days.map((date) => {
      const iso = date.toISODate()!
      const times: Record<string, DateTime> = {}

      for (const key of keys) {
        // A market time the exchange had not introduced yet, or has since
        // dropped, simply has no column on that day.
        const time = special.get(key)?.get(iso) ?? this.timeOn(key, date)
        if (time) times[key] = this.at(date, time)
      }

      if (!times.market_open || !times.market_close) {
        throw new Error(
          `${this.name} has no market_open/market_close in effect on ${iso}.`,
        )
      }

      if (forceSpecialTimes === true) {
        this.conformToSpecialTimes(times, keys, special, iso, date)
      }

      const zoned = Object.fromEntries(
        Object.entries(times).map(([key, at]) => [key, at.setZone(tz)]),
      )

      return {
        ...zoned,
        date,
        market_open: zoned.market_open,
        market_close: zoned.market_close,
      } satisfies MarketDaySchedule
    })
  }

  /**
   * Pull the other columns inside a special open or close.
   *
   * A day that closes early has no business publishing a post session that
   * outlasts it. A column with a special time of its own is authoritative
   * though, so those are put back afterwards: NYSE's half-days close at 13:00
   * and still run a post session until 17:00.
   */
  private conformToSpecialTimes(
    times: Record<string, DateTime>,
    keys: MarketTimeKey[],
    special: Map<MarketTimeKey, Map<string, TimeOfDay>>,
    iso: string,
    date: DateTime,
  ): void {
    if (special.get('market_open')?.has(iso)) {
      for (const key of keys) {
        if (times[key] && times[key] < times.market_open) {
          times[key] = times.market_open
        }
      }
    }

    if (special.get('market_close')?.has(iso)) {
      for (const key of keys) {
        if (times[key] && times[key] > times.market_close) {
          times[key] = times.market_close
        }
      }
    }

    for (const key of keys) {
      if (key === 'market_open' || key === 'market_close') continue
      const own = special.get(key)?.get(iso)
      if (own) times[key] = this.at(date, own)
    }
  }

  /**
   * Whether the market is trading at a given instant.
   *
   * Each market time either opens the market or closes it, and an instant is
   * open when the most recent one before it was an opening. A lunch break
   * therefore reads as closed without being a special case. Where a schedule
   * has a post session the regular close no longer ends trading, so an
   * afternoon instant is still open; `onlyRTH` asks the narrower question.
   *
   * An instant on a day the market never opens is closed rather than an error.
   *
   * @param dt The instant to test
   * @param options Whether to count the close, and whether to ignore
   *   extended hours
   * @returns true when the market is trading at `dt`
   */
  openAtTime(dt: DateTime, options: OpenAtTimeOptions = {}): boolean {
    const { includeClose = false, onlyRTH = false } = options
    const local = dt.setZone(this.tz)

    // A session can open the evening before its own trade date, so the
    // neighbouring days are searched as well as this one.
    const window = this.schedule(
      local.minus({ days: 1 }),
      local.plus({ days: 1 }),
    )
    const events = window
      .flatMap((day) => this.marketEvents(day, onlyRTH))
      .sort((a, b) => a.at.toMillis() - b.at.toMillis())

    let last: MarketEvent | undefined
    for (const event of events) {
      if (event.at > local) break
      last = event
    }

    if (!last) return false
    if (last.opens) return true
    return includeClose && +last.at === +local
  }

  /**
   * The opening and closing events of one scheduled day, in time order.
   *
   * @param day A row of a schedule
   * @param onlyRTH Leave out the extended-hours sessions
   * @returns The day's events, each saying whether it opens the market
   */
  private marketEvents(
    day: MarketDaySchedule,
    onlyRTH: boolean,
  ): MarketEvent[] {
    const times = MARKET_TIME_ORDER.filter(
      (key) => day[key] && !(onlyRTH && (key === 'pre' || key === 'post')),
    )
      .map((key) => ({ key, at: day[key] }))
      .sort((a, b) => a.at.toMillis() - b.at.toMillis())

    return times.map((event, index) => ({
      at: event.at,
      // A close followed by a post session hands trading over rather than
      // ending it, so it reads as an opening.
      opens:
        event.key === 'market_close' && times[index + 1]?.key === 'post'
          ? true
          : OPENS_MARKET[event.key],
    }))
  }

  /**
   * Whether the market is trading right now.
   *
   * @param options Whether to count the close, and whether to ignore
   *   extended hours
   * @returns true when the market is trading at the current instant
   */
  isOpenNow(options: OpenAtTimeOptions = {}): boolean {
    return this.openAtTime(DateTime.now(), options)
  }

  /**
   * The days of a schedule whose market time differs from the regular one.
   *
   * @param schedule - Days to inspect
   * @param key - The market time column to compare
   * @param compare - How the observed time must relate to the regular one;
   *   defaults to any difference
   * @returns The matching days, in schedule order
   */
  isDifferent(
    schedule: MarketSchedule,
    key: MarketTimeKey,
    compare: (observed: DateTime, regular: DateTime) => boolean = (
      observed,
      regular,
    ) => +observed !== +regular,
  ): MarketSchedule {
    return schedule.filter((day) => {
      const observed = day[key]
      const time = this.timeOn(key, day.date)
      return observed && time
        ? compare(observed, this.at(day.date, time))
        : false
    })
  }

  /**
   * The days of a schedule that close earlier than usual.
   *
   * @param schedule - Days to inspect
   * @returns The early closes, in schedule order
   */
  earlyCloses(schedule: MarketSchedule): MarketSchedule {
    return this.isDifferent(
      schedule,
      'market_close',
      (observed, regular) => observed < regular,
    )
  }

  /**
   * The days of a schedule that open later than usual.
   *
   * @param schedule - Days to inspect
   * @returns The late opens, in schedule order
   */
  lateOpens(schedule: MarketSchedule): MarketSchedule {
    return this.isDifferent(
      schedule,
      'market_open',
      (observed, regular) => observed > regular,
    )
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
    // A discontinued market time resolves to nothing, so its column is absent.
    return (
      (history ? valueOn(history, date.toISODate()!) : undefined) ?? undefined
    )
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

  /** Apply a wall-clock time to a session date, honouring its day offset. */
  private at(date: DateTime, [hour, minute, dayOffset]: TimeOfDay): DateTime {
    const at = date.set({ hour, minute, second: 0, millisecond: 0 })
    return dayOffset ? at.plus({ days: dayOffset }) : at
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
