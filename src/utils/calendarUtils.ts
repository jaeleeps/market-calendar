import { DateTime, Duration } from 'luxon'
import { Weekday } from './constants'
import {
  DateRangeSession,
  Frequency,
  IntradaySession,
  IntervalClosed,
  MarketDaySchedule,
  MarketSchedule,
  MergeStrategy,
  CalendarPeriod,
  TimestampLike,
  TradingSessionLabel,
} from './types'
import {
  DisappearingSessionWarning,
  DroppedMarketTimesWarning,
  InsufficientScheduleWarning,
  MissingSessionWarning,
  OverlappingSessionWarning,
  emitCalendarWarning,
} from './warnings'
import { DEFAULT_LABEL_MAP } from './sessionUtils'
import { Holiday } from '../core/Holiday'
import { HolidayCalendar } from '../core/HolidayCalendar'

/**
 * Returns a mapping of timestamps to trading session labels based on schedule.
 *
 * @param schedule - The market schedule DataFrame
 * @param timestamps - Array of DateTime timestamps
 * @param labelMap - Optional override for label names
 * @param closed - Which edge of a session contains its own boundary:
 *   'right' for (start, end], 'left' for [start, end)
 * @returns A mapping from each timestamp to a session label
 */
export function markSession(
  schedule: MarketSchedule,
  timestamps: DateTime[],
  labelMap: Partial<Record<TradingSessionLabel, string>> = {},
  closed: IntervalClosed = 'right',
): Record<string, string> {
  const sessionLabels = availableSessions(schedule)
  const rows = new Map<string, MarketDaySchedule>()
  for (const day of schedule) {
    const iso = day.date.toISODate()
    if (iso) rows.set(iso, day)
  }

  // Timestamps are matched against the session date in the schedule's own zone.
  const zone = schedule[0]?.date.zone
  const result: Record<string, string> = {}

  for (const ts of timestamps) {
    const key = ts.toISO()
    if (!key) continue

    const local = zone ? ts.setZone(zone) : ts
    const row = rows.get(local.toISODate() ?? '')
    const label = row
      ? getLabelForTimestamp(local, row, sessionLabels, closed)
      : 'closed'
    result[key] = labelMap[label] ?? DEFAULT_LABEL_MAP[label]
  }

  return result
}

/**
 * Determine which session labels a schedule can actually resolve, based on the
 * market time columns it carries.
 *
 * @param schedule - The market schedule
 * @returns Session labels in the order they should be tested
 */
function availableSessions(schedule: MarketSchedule): TradingSessionLabel[] {
  const columns = new Set(Object.keys(schedule[0] ?? {}))
  const sessions: TradingSessionLabel[] = []

  const add = (session: TradingSessionLabel, parts: string[]) => {
    if (parts.every((part) => columns.has(part))) sessions.push(session)
  }

  add('pre', ['pre', 'market_open'])
  if (columns.has('break_start') && columns.has('break_end')) {
    add('rth_pre_break', ['market_open', 'break_start'])
    add('break', ['break_start', 'break_end'])
    add('rth_post_break', ['break_end', 'market_close'])
  } else {
    add('rth', ['market_open', 'market_close'])
  }
  add('post', ['market_close', 'post'])

  return sessions
}

/** The only columns a merged schedule carries. */
const MERGED_COLUMNS = ['date', 'market_open', 'market_close']

/**
 * Merge multiple market schedules into one.
 *
 * An outer merge spans every day any market trades, taking the earliest open
 * and the latest close. An inner merge keeps only the days every market trades,
 * taking the latest open and the earliest close, and drops a day when that
 * leaves no overlap at all.
 *
 * Only the open and the close survive: a merged break or extended-hours session
 * has no meaning across exchanges, so those columns are dropped and a
 * DroppedMarketTimesWarning is raised.
 *
 * @param schedules - The schedules to merge
 * @param how - 'outer' for the union of trading days, 'inner' for the overlap
 * @returns The merged schedule, ordered by date
 *
 * @example
 * mergeSchedules([nyse.schedule(a, b), lse.schedule(a, b)], 'inner')
 * // => the window in which both exchanges are open
 */
export function mergeSchedules(
  schedules: MarketSchedule[],
  how: MergeStrategy = 'outer',
): MarketSchedule {
  if (how !== 'outer' && how !== 'inner') {
    throw new Error(`how must be "outer" or "inner", got "${String(how)}"`)
  }
  if (schedules.length === 0) return []

  reportDroppedColumns(schedules)

  const indexed = schedules.map((schedule) => {
    const byDate = new Map<string, MarketDaySchedule>()
    for (const day of schedule) {
      const iso = day.date.toISODate()
      if (iso) byDate.set(iso, day)
    }
    return byDate
  })

  const merged: MarketSchedule = []

  for (const iso of mergedDates(indexed, how)) {
    const rows = indexed
      .map((byDate) => byDate.get(iso))
      .filter((row): row is MarketDaySchedule => row !== undefined)
    if (rows.length === 0) continue

    const opens = rows.map((row) => row.market_open)
    const closes = rows.map((row) => row.market_close)
    const market_open = how === 'outer' ? min(opens) : max(opens)
    const market_close = how === 'outer' ? max(closes) : min(closes)

    // An inner merge only means something while the markets actually overlap.
    if (how === 'inner' && market_open >= market_close) continue

    merged.push({ date: rows[0].date, market_open, market_close })
  }

  return merged
}

/**
 * The dates a merge covers: every date for an outer merge, only the shared
 * ones for an inner merge.
 */
function mergedDates(
  indexed: Map<string, MarketDaySchedule>[],
  how: MergeStrategy,
): string[] {
  const [first, ...rest] = indexed
  const dates =
    how === 'outer'
      ? new Set(indexed.flatMap((byDate) => [...byDate.keys()]))
      : new Set(
          [...first.keys()].filter((iso) =>
            rest.every((byDate) => byDate.has(iso)),
          ),
        )

  return [...dates].sort()
}

/** Report which market times the merge is about to discard. */
function reportDroppedColumns(schedules: MarketSchedule[]): void {
  const dropped = new Set<string>()
  for (const schedule of schedules) {
    for (const column of Object.keys(schedule[0] ?? {})) {
      if (!MERGED_COLUMNS.includes(column)) dropped.add(column)
    }
  }

  if (dropped.size > 0) {
    emitCalendarWarning(new DroppedMarketTimesWarning([...dropped].sort()))
  }
}

/**
 * Return the label for a timestamp based on session timing.
 *
 * @param ts - The DateTime timestamp
 * @param times - The session times for a day
 * @param labels - List of possible session labels
 * @param closed - Which edge of a session contains its own boundary
 * @returns The matching label, or 'closed' when no session contains it
 */
function getLabelForTimestamp(
  ts: DateTime,
  times: Record<string, DateTime>,
  labels: TradingSessionLabel[],
  closed: IntervalClosed,
): TradingSessionLabel {
  const checks: Partial<Record<TradingSessionLabel, [DateTime, DateTime]>> = {
    pre: [times['pre'], times['market_open']],
    rth_pre_break: [times['market_open'], times['break_start']],
    break: [times['break_start'], times['break_end']],
    rth_post_break: [times['break_end'], times['market_close']],
    rth: [times['market_open'], times['market_close']],
    post: [times['market_close'], times['post']],
    closed: [DateTime.fromMillis(0), DateTime.fromMillis(0)],
  }

  for (const label of labels) {
    const range = checks[label]
    if (!range) continue
    const [start, end] = range
    if (!start || !end) continue

    // Adjacent sessions share a boundary, so exactly one of them may claim it.
    const within =
      closed === 'right' ? ts > start && ts <= end : ts >= start && ts < end
    if (within) return label
  }
  return 'closed'
}

/**
 * Return the minimum of an array of DateTime values
 */
function min(dates: DateTime[]): DateTime {
  return dates.reduce((a, b) => (a < b ? a : b))
}

/**
 * Return the maximum of an array of DateTime values
 */
function max(dates: DateTime[]): DateTime {
  return dates.reduce((a, b) => (a > b ? a : b))
}

/** Period codes accepted wherever a calendar period is named. */
const PERIOD_CODES: Record<string, CalendarPeriod> = {
  d: 'day',
  day: 'day',
  w: 'week',
  week: 'week',
  m: 'month',
  me: 'month',
  ms: 'month',
  month: 'month',
  q: 'quarter',
  qe: 'quarter',
  qs: 'quarter',
  quarter: 'quarter',
  y: 'year',
  ye: 'year',
  ys: 'year',
  a: 'year',
  year: 'year',
}

/** Months, for anchoring quarters and years. */
const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]

/** Weekdays, for anchoring weeks. */
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/**
 * Read a period code, with or without a leading multiple.
 *
 * @param frequency - Something like 'W', '2M', 'quarter' or 3 (days)
 * @returns The multiple and the period it counts
 * @throws If the code names no period, or the multiple is not positive
 */
function toPeriod(frequency: string | number): [number, CalendarPeriod] {
  if (typeof frequency === 'number') {
    if (!Number.isInteger(frequency) || frequency < 1) {
      throw new Error(`Frequency must be a positive whole number of days`)
    }
    return [frequency, 'day']
  }

  const match = /^\s*(\d*)\s*([a-z]+)\s*$/i.exec(frequency)
  const period = match ? PERIOD_CODES[match[2].toLowerCase()] : undefined
  if (!match || !period) throw new Error(`Invalid frequency: ${frequency}`)

  const multiple = match[1] === '' ? 1 : Number(match[1])
  if (multiple < 1) throw new Error(`Invalid frequency: ${frequency}`)
  return [multiple, period]
}

/**
 * The period a date belongs to, as a key that changes when the period does.
 */
function periodKey(
  date: DateTime,
  period: CalendarPeriod,
  { weekStartsOn, yearStartsIn }: Required<HigherTimeframeAnchors>,
): string {
  switch (period) {
    case 'day':
      return date.toISODate()!
    case 'week': {
      // Wind back to the weekday the week is anchored on.
      const back = (date.weekday - weekStartsOn + 7) % 7
      return date.minus({ days: back }).toISODate()!
    }
    case 'month':
      return `${date.year}-${date.month}`
    case 'quarter': {
      const offset = (date.month - yearStartsIn + 12) % 12
      const year = date.month >= yearStartsIn ? date.year : date.year - 1
      return `${year}-Q${Math.floor(offset / 3)}`
    }
    case 'year':
      return `${date.month >= yearStartsIn ? date.year : date.year - 1}`
  }
}

/**
 * Convert a list of DateTime instances to a lower frequency by keeping the
 * first of each period.
 *
 * Mimics pandas `asfreq()` in spirit: unlike pandas it never introduces a
 * date that was not in the input, so a period with no dates is simply absent.
 *
 * @param timestamps - Array of DateTime objects
 * @param frequency - A period name or code: 'day', 'W', 'ME', 'quarter', 'Y'
 * @returns One timestamp per period, in order
 */
export function convertFreq(
  timestamps: DateTime[],
  frequency: string,
): DateTime[] {
  const [, period] = toPeriod(frequency)
  const anchors = { weekStartsOn: 7, yearStartsIn: 1 }
  const seen = new Set<string>()
  const result: DateTime[] = []

  for (const dt of timestamps) {
    const key = periodKey(dt, period, anchors)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(dt)
  }

  return result
}

/** Where weeks and years begin, for the higher timeframes. */
export interface HigherTimeframeAnchors {
  /** Weekday a week starts on, as a Luxon weekday. Defaults to Sunday. */
  weekStartsOn?: Weekday
  /** Month a year starts in, 1 to 12. Defaults to January. */
  yearStartsIn?: number
}

/** Options for `dateRangeHTF`. */
export interface HigherTimeframeOptions extends HigherTimeframeAnchors {
  /**
   * Which trading day of each period to take: 'right' the last, 'left' the
   * first. Defaults to 'right'. Ignored when counting days.
   */
  closed?: IntervalClosed
  /** Earliest date to return. */
  start?: TimestampLike
  /** Latest date to return. */
  end?: TimestampLike
  /** How many periods to return, from the start or back from the end. */
  periods?: number
}

/**
 * Pick one trading day per period, for periods of a day and longer.
 *
 * A day frequency counts trading days, so '2D' is every other trading day
 * rather than every second calendar day. Longer periods return the first or
 * last trading day of each — the last day of the month, say, whatever weekday
 * that turns out to be.
 *
 * @param days - Trading days, as from `MarketCalendar.validDays()`
 * @param frequency - A period code such as '1D', '2W', 'ME', 'Q' or 'Y'
 * @param options - Which end of the period to take, the anchors, and limits
 * @returns The chosen trading days, in order
 *
 * @example
 * dateRangeHTF(nyse.validDays('2024-01-01', '2024-12-31'), 'ME')
 * // => the last trading day of each month
 */
export function dateRangeHTF(
  days: DateTime[],
  frequency: string | number,
  options: HigherTimeframeOptions = {},
): DateTime[] {
  const {
    closed = 'right',
    weekStartsOn = Weekday.SUNDAY,
    yearStartsIn = 1,
  } = options
  const [multiple, period] = toPeriod(frequency)

  let chosen: DateTime[]
  if (period === 'day') {
    // Every nth trading day, counted from the first one given.
    chosen = days.filter((_, index) => index % multiple === 0)
  } else {
    const anchors = { weekStartsOn, yearStartsIn }
    const byPeriod = new Map<string, DateTime[]>()
    for (const day of days) {
      const key = periodKey(day, period, anchors)
      const group = byPeriod.get(key)
      if (group) group.push(day)
      else byPeriod.set(key, [day])
    }

    const picked = [...byPeriod.values()].map((group) =>
      closed === 'right' ? group[group.length - 1] : group[0],
    )
    chosen = picked.filter((_, index) => index % multiple === 0)
  }

  return limitDays(chosen, options)
}

/** Apply the start, end and period count of a higher timeframe range. */
function limitDays(
  days: DateTime[],
  { start, end, periods }: HigherTimeframeOptions,
): DateTime[] {
  let result = days
  const zone = days[0]?.zoneName ?? 'UTC'

  if (start !== undefined) {
    const from = toTimestamp(start, zone).startOf('day')
    result = result.filter((d) => d >= from)
  }
  if (end !== undefined) {
    const to = toTimestamp(end, zone).endOf('day')
    result = result.filter((d) => d <= to)
  }

  if (periods === undefined || (start !== undefined && end !== undefined)) {
    return result
  }
  if (!Number.isInteger(periods) || periods < 0) {
    throw new Error(`periods must be a non-negative integer, got ${periods}`)
  }
  if (periods === 0) return []

  const backwards = end !== undefined && start === undefined
  return backwards ? result.slice(-periods) : result.slice(0, periods)
}

/**
 * Return the holiday date if it is only observed once, else undefined.
 *
 * @param holiday - Holiday instance
 * @returns The static date if it's a one-time holiday
 */
export function isSingleObservance(holiday: Holiday): DateTime | undefined {
  if (!holiday.startDate || !holiday.endDate) return undefined
  return holiday.startDate.equals(holiday.endDate)
    ? holiday.startDate
    : undefined
}

/**
 * Return all static holiday dates if the calendar contains only single-observance holidays.
 *
 * @param calendar - HolidayCalendar instance
 * @returns Array of dates if all holidays are static, otherwise undefined
 */
export function allSingleObservanceRules(
  calendar: HolidayCalendar,
): DateTime[] | undefined {
  const dates = calendar.rules
    .map((rule: Holiday) => isSingleObservance(rule))
    .filter((d): d is DateTime => Boolean(d))
  return dates.length === calendar.rules.length ? dates : undefined
}

/** Options controlling how `dateRange` interpolates a schedule. */
export interface DateRangeOptions {
  /** Which endpoint of each bar to label. Defaults to 'right'. */
  closed?: IntervalClosed
  /**
   * How the last bar of a session is handled when the grid overshoots:
   * true pins the session close, false drops the bar, null keeps the
   * overshooting timestamp. Defaults to true.
   */
  forceClose?: boolean | null
  /** Session or sessions to interpolate. Defaults to 'RTH'. */
  session?: DateRangeSession | DateRangeSession[]
  /** Merge sessions that meet end-to-start. Defaults to true. */
  mergeAdjacent?: boolean
  /** Earliest timestamp to return. Defaults to where the schedule starts. */
  start?: TimestampLike
  /** Latest timestamp to return. Defaults to where the schedule ends. */
  end?: TimestampLike
  /**
   * How many timestamps to return: the first `periods` from `start`, or the
   * last `periods` up to `end`. Ignored when both bounds are given.
   */
  periods?: number
}

/** Column pairs that bound each session, in the order they occur in a day. */
const SESSION_COLUMNS: Record<IntradaySession, [string, string][]> = {
  pre: [['pre', 'market_open']],
  RTH: [['market_open', 'market_close']],
  post: [['market_close', 'post']],
  ETH: [
    ['pre', 'market_open'],
    ['market_close', 'post'],
  ],
  break: [['break_start', 'break_end']],
  pre_break: [['market_open', 'break_start']],
  post_break: [['break_end', 'market_close']],
}

/** RTH splits around a lunch break when the schedule has one. */
const RTH_WITH_BREAK: [string, string][] = [
  ['market_open', 'break_start'],
  ['break_end', 'market_close'],
]

/** One session of one day, resolved to concrete timestamps. */
interface SessionInterval {
  date: string
  start: DateTime
  end: DateTime
}

/**
 * Interpolate a market schedule at a fixed frequency.
 *
 * Returns one timestamp per bar for the requested sessions. Intervals shorter
 * than the frequency, and timestamps that run past the end of their session,
 * are reported through the DateRange warnings; see `filterDateRangeWarnings`.
 *
 * `start`, `end` and `periods` trim the result; they never shift the grid, so
 * a start between two bars returns the following bar rather than realigning to
 * the start itself.
 *
 * Only frequencies of a day or less are supported.
 *
 * @param schedule - A schedule as produced by `MarketCalendar.schedule()`
 * @param frequency - Bar size: seconds, a Duration, or a string like '15min'
 * @param options - Session selection and interval labelling
 * @returns Bar timestamps in ascending order
 *
 * @example
 * dateRange(nyse.schedule('2024-07-01', '2024-07-01'), '1h', { closed: 'left' })
 * // => [09:30, 10:30, 11:30, 12:30, 13:30, 14:30, 15:30]
 */
export function dateRange(
  schedule: MarketSchedule,
  frequency: Frequency,
  options: DateRangeOptions = {},
): DateTime[] {
  const {
    closed = 'right',
    forceClose = true,
    session = 'RTH',
    mergeAdjacent = true,
  } = options

  const step = toStep(frequency)
  const intervals = sessionIntervals(schedule, session, mergeAdjacent)

  const includeStart = closed === 'left' || closed === 'both'
  const includeEnd = closed === 'right' || closed === 'both'
  const timestamps: DateTime[] = []
  const vanished: string[] = []
  const overlapping: string[] = []

  intervals.forEach((interval, index) => {
    const before = timestamps.length

    if (includeStart) timestamps.push(interval.start)

    let current = interval.start.plus(step)
    while (current < interval.end) {
      timestamps.push(current)
      current = current.plus(step)
    }

    if (includeEnd) {
      if (+current === +interval.end) {
        timestamps.push(interval.end)
      } else if (forceClose === true) {
        // The bar grid overshoots the close, so pin the close itself.
        timestamps.push(interval.end)
      } else if (forceClose === null) {
        timestamps.push(current)
        const next = intervals[index + 1]
        if (next && current > next.start) overlapping.push(interval.date)
      }
      // forceClose === false drops the overshooting bar entirely.
    }

    if (timestamps.length === before) vanished.push(interval.date)
  })

  if (vanished.length > 0) {
    emitCalendarWarning(new DisappearingSessionWarning(vanished))
  }
  if (overlapping.length > 0) {
    emitCalendarWarning(new OverlappingSessionWarning(overlapping))
  }

  return limitRange(dedupe(timestamps), options, schedule)
}

/**
 * Trim the generated index to the requested bounds and period count.
 *
 * The bounds select from the grid rather than moving it, so a start that falls
 * between two bars yields the following bar. A schedule that cannot reach a
 * bound, or yield the requested number of periods, is reported.
 */
function limitRange(
  timestamps: DateTime[],
  { start, end, periods }: DateRangeOptions,
  schedule: MarketSchedule,
): DateTime[] {
  if (start === undefined && end === undefined && periods === undefined) {
    return timestamps
  }
  if (timestamps.length === 0) return timestamps

  const zone = schedule[0].market_open.zoneName ?? 'UTC'
  const from = start === undefined ? undefined : toTimestamp(start, zone)
  const to = end === undefined ? undefined : toTimestamp(end, zone)

  if (from && to && from > to) {
    throw new Error(`start ${from.toISO()} is after end ${to.toISO()}`)
  }

  const first = timestamps[0]
  const last = timestamps[timestamps.length - 1]
  if (from && from < first) {
    emitCalendarWarning(new InsufficientScheduleWarning(true, from, first))
  }
  if (to && to > last) {
    emitCalendarWarning(new InsufficientScheduleWarning(false, to, last))
  }

  let result = timestamps
  if (from) result = result.filter((ts) => ts >= from)
  if (to) result = result.filter((ts) => ts <= to)

  // A period count only decides which end to take from; with both bounds
  // given the range is already fully determined.
  if (periods === undefined || (from && to)) return result
  if (!Number.isInteger(periods) || periods < 0) {
    throw new Error(`periods must be a non-negative integer, got ${periods}`)
  }
  if (periods === 0) return []

  // Counting back from an end runs out at the start of the schedule.
  const backwards = to !== undefined && from === undefined
  if (result.length < periods) {
    emitCalendarWarning(
      new InsufficientScheduleWarning(backwards, periods, result.length),
    )
  }

  return backwards ? result.slice(-periods) : result.slice(0, periods)
}

/**
 * Read a bound as a timestamp. A string without an offset is read in the
 * schedule's own timezone, and a number as POSIX seconds.
 */
function toTimestamp(value: TimestampLike, zone: string): DateTime {
  const dt =
    typeof value === 'number'
      ? DateTime.fromSeconds(value, { zone })
      : typeof value === 'string'
        ? DateTime.fromISO(value, { zone })
        : value

  if (!dt.isValid) throw new Error(`Invalid timestamp: ${String(value)}`)
  return dt
}

/**
 * Resolve the requested sessions against the schedule's columns, warning about
 * any the schedule cannot supply.
 */
function sessionIntervals(
  schedule: MarketSchedule,
  session: DateRangeSession | DateRangeSession[],
  mergeAdjacent: boolean,
): SessionInterval[] {
  const requested = Array.isArray(session) ? session : [session]
  const columns = new Set(Object.keys(schedule[0] ?? {}))
  const hasBreak = columns.has('break_start') && columns.has('break_end')

  const pairs: [string, string][] = []
  const gaps: DateRangeSession[] = []
  const skipped: string[] = []
  const missing = new Set<string>()

  for (const name of requested) {
    if (name === 'closed' || name === 'closed_masked') {
      gaps.push(name)
      continue
    }

    const wanted =
      name === 'RTH' && hasBreak ? RTH_WITH_BREAK : SESSION_COLUMNS[name]
    if (!wanted) throw new Error(`Unknown session: ${name}`)

    const absent = wanted.flat().filter((column) => !columns.has(column))
    if (absent.length > 0) {
      skipped.push(name)
      absent.forEach((column) => missing.add(column))
      continue
    }
    pairs.push(...wanted)
  }

  if (skipped.length > 0) {
    emitCalendarWarning(new MissingSessionWarning(skipped, [...missing]))
  }

  const intervals: SessionInterval[] = []
  for (const day of schedule) {
    const date = day.date.toISODate() ?? ''
    for (const [from, to] of pairs) {
      intervals.push({ date, start: day[from], end: day[to] })
    }
  }
  for (const gap of gaps) {
    intervals.push(...closedIntervals(schedule, gap === 'closed_masked'))
  }

  // Gaps span days, so ordering and merging are global rather than per day.
  const spans = intervals
    .filter((span) => span.start && span.end && span.start < span.end)
    .sort((a, b) => a.start.toMillis() - b.start.toMillis())

  return mergeAdjacent ? merged(spans) : spans
}

/**
 * Build the intervals between one trading day's last market time and the next
 * day's first, which is when the market is shut.
 *
 * The last day has no reopening inside the schedule, so its gap runs to
 * midnight. When masked, a gap that spans a weekend or a holiday stops at
 * midnight after the last trading day and resumes at midnight before the next
 * one, leaving the closed days out entirely.
 *
 * Midnight here is midnight in the schedule's own timezone.
 */
function closedIntervals(
  schedule: MarketSchedule,
  masked: boolean,
): SessionInterval[] {
  const columns = new Set(Object.keys(schedule[0] ?? {}))
  // Extended hours bound the gap when the schedule publishes them.
  const closes = columns.has('post') ? 'post' : 'market_close'
  const opens = columns.has('pre') ? 'pre' : 'market_open'

  const intervals: SessionInterval[] = []

  schedule.forEach((day, index) => {
    const date = day.date.toISODate() ?? ''
    const from = day[closes]
    if (!from) return

    const next = schedule[index + 1]
    const midnightAfter = day.date.startOf('day').plus({ days: 1 })

    if (!next) {
      intervals.push({ date, start: from, end: midnightAfter })
      return
    }

    const to = next[opens]
    if (!to) return

    const consecutive =
      day.date.startOf('day').plus({ days: 1 }).toISODate() ===
      next.date.toISODate()

    if (masked && !consecutive) {
      intervals.push({ date, start: from, end: midnightAfter })
      intervals.push({
        date: next.date.toISODate() ?? '',
        start: next.date.startOf('day'),
        end: to,
      })
      return
    }

    intervals.push({ date, start: from, end: to })
  })

  return intervals
}

/** Collapse sessions that meet end-to-start into one continuous interval. */
function merged(spans: SessionInterval[]): SessionInterval[] {
  const result: SessionInterval[] = []

  for (const span of spans) {
    const last = result[result.length - 1]
    if (last && +last.end === +span.start) {
      result[result.length - 1] = { ...last, end: span.end }
    } else {
      result.push(span)
    }
  }

  return result
}

/** Drop repeated timestamps, which adjacent unmerged sessions can produce. */
function dedupe(timestamps: DateTime[]): DateTime[] {
  return timestamps.filter(
    (ts, index) => index === 0 || +ts !== +timestamps[index - 1],
  )
}

/** Units accepted in a frequency string. */
const FREQUENCY_UNITS: Record<string, string> = {
  s: 'seconds',
  sec: 'seconds',
  secs: 'seconds',
  second: 'seconds',
  seconds: 'seconds',
  m: 'minutes',
  min: 'minutes',
  mins: 'minutes',
  minute: 'minutes',
  minutes: 'minutes',
  h: 'hours',
  hr: 'hours',
  hrs: 'hours',
  hour: 'hours',
  hours: 'hours',
  d: 'days',
  day: 'days',
  days: 'days',
}

/**
 * Normalize a frequency to a Duration.
 *
 * @param frequency - Seconds, a Duration, or a string such as '15min'
 * @returns The bar size as a Duration
 * @throws If the frequency is not positive, or is longer than a day
 */
function toStep(frequency: Frequency): Duration {
  let step: Duration

  if (typeof frequency === 'number') {
    step = Duration.fromObject({ seconds: frequency })
  } else if (typeof frequency === 'string') {
    const match = /^\s*(\d+(?:\.\d+)?)\s*([a-z]+)\s*$/i.exec(frequency)
    const unit = match ? FREQUENCY_UNITS[match[2].toLowerCase()] : undefined
    if (!match || !unit) throw new Error(`Invalid frequency: ${frequency}`)
    step = Duration.fromObject({ [unit]: Number(match[1]) })
  } else {
    step = frequency
  }

  if (!step.isValid || step.as('milliseconds') <= 0) {
    throw new Error(
      `Frequency must be a positive duration: ${String(frequency)}`,
    )
  }
  if (step.as('days') > 1) {
    throw new Error('Frequencies longer than a day are not supported.')
  }

  return step
}
