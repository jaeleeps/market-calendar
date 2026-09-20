import { DateTime, Duration } from 'luxon'
import {
  DateRangeSession,
  Frequency,
  IntervalClosed,
  MarketDaySchedule,
  MarketSchedule,
  TradingSessionLabel,
} from './types'
import {
  DisappearingSessionWarning,
  MissingSessionWarning,
  OverlappingSessionWarning,
  emitDateRangeWarning,
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
 * @returns A mapping from each timestamp to a session label
 */
export function markSession(
  schedule: MarketSchedule,
  timestamps: DateTime[],
  labelMap: Partial<Record<TradingSessionLabel, string>> = {},
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
      ? getLabelForTimestamp(local, row, sessionLabels)
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

/**
 * Merge multiple market schedules by combining overlapping open/close intervals.
 *
 * @param schedules - List of market schedules
 * @param how - 'outer' for union, 'inner' for intersection
 * @returns The merged market schedule
 */
export function mergeSchedules(
  schedules: MarketSchedule[],
  how: 'inner' | 'outer' = 'outer',
): MarketSchedule {
  if (schedules.length === 0) return []
  if (schedules.length === 1) return schedules[0]

  const merged: MarketSchedule = []

  for (const session of schedules[0]) {
    const day = session.date
    const others = schedules
      .slice(1)
      .map((s) => s.find((d) => d.date.hasSame(day, 'day')))
    if (others.some((s) => !s)) continue

    const allOpens = [session.market_open, ...others.map((s) => s!.market_open)]
    const allCloses = [
      session.market_close,
      ...others.map((s) => s!.market_close),
    ]

    const market_open = how === 'outer' ? min(allOpens) : max(allOpens)
    const market_close = how === 'outer' ? max(allCloses) : min(allCloses)

    merged.push({ date: day, market_open, market_close })
  }

  return merged
}

/**
 * Return the label for a timestamp based on session timing.
 *
 * @param ts - The DateTime timestamp
 * @param times - The session times for a day
 * @param labels - List of possible session labels
 * @returns The matching label, or 'closed' when no session contains it
 */
function getLabelForTimestamp(
  ts: DateTime,
  times: Record<string, DateTime>,
  labels: TradingSessionLabel[],
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
    if (start && end && ts >= start && ts <= end) {
      return label
    }
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

/**
 * Convert a list of DateTime instances to a lower frequency
 * by returning the first timestamp in each group.
 *
 * Mimics pandas `asfreq()` behavior.
 *
 * @param timestamps - Array of DateTime objects
 * @param frequency - Desired frequency: 'day' | 'week' | 'month' | 'year'
 * @returns Deduplicated DateTime array at the specified frequency
 */
export function convertFreq(
  timestamps: DateTime[],
  frequency: 'day' | 'week' | 'month' | 'year',
): DateTime[] {
  const seen = new Set<string>()
  const result: DateTime[] = []

  for (const dt of timestamps) {
    let key: string
    switch (frequency) {
      case 'day':
        key = dt.toISODate() ?? ''
        break
      case 'week':
        key = `${dt.weekYear}-W${dt.weekNumber}`
        break
      case 'month':
        key = `${dt.year}-${dt.month}`
        break
      case 'year':
        key = `${dt.year}`
        break
      default:
        throw new Error(`Unsupported frequency: ${frequency}`)
    }

    if (!seen.has(key)) {
      seen.add(key)
      result.push(dt)
    }
  }

  return result
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
}

/** Column pairs that bound each session, in the order they occur in a day. */
const SESSION_COLUMNS: Record<DateRangeSession, [string, string][]> = {
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
    emitDateRangeWarning(new DisappearingSessionWarning(vanished))
  }
  if (overlapping.length > 0) {
    emitDateRangeWarning(new OverlappingSessionWarning(overlapping))
  }

  return dedupe(timestamps)
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
  const skipped: string[] = []
  const missing = new Set<string>()

  for (const name of requested) {
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
    emitDateRangeWarning(new MissingSessionWarning(skipped, [...missing]))
  }

  const intervals: SessionInterval[] = []
  for (const day of schedule) {
    const date = day.date.toISODate() ?? ''
    const spans = pairs
      .map(([from, to]) => ({ date, start: day[from], end: day[to] }))
      .filter((span) => span.start && span.end && span.start < span.end)
      .sort((a, b) => a.start.toMillis() - b.start.toMillis())

    intervals.push(...(mergeAdjacent ? merged(spans) : spans))
  }

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
