import { DateTime, Interval } from 'luxon'
import { MarketSchedule, TradingSessionLabel } from './types'
import { DEFAULT_LABEL_MAP } from './sessionUtils'
import { Holiday } from '../core/Holiday'

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
  const sessionLabels: TradingSessionLabel[] = ['closed']
  const columns = new Set(Object.keys(schedule[0] || {}))
  const neededCols = new Set<string>()

  function extendStatement(session: TradingSessionLabel, parts: string[]) {
    if (parts.every((p) => columns.has(p))) {
      parts.forEach((p) => neededCols.add(p))
      sessionLabels.push(session)
    }
  }

  extendStatement('pre', ['pre', 'market_open'])
  if (columns.has('break_start') && columns.has('break_end')) {
    extendStatement('rth_pre_break', ['market_open', 'break_start'])
    extendStatement('break', ['break_start', 'break_end'])
    extendStatement('rth_post_break', ['break_end', 'market_close'])
  } else {
    extendStatement('rth', ['market_open', 'market_close'])
  }
  extendStatement('post', ['market_close', 'post'])

  const mappedLabels = sessionLabels.map(
    (label) => labelMap[label] ?? DEFAULT_LABEL_MAP[label],
  )
  const result: Record<string, string> = {}

  for (const ts of timestamps) {
    for (const day of schedule) {
      const { date, ...times } = day
      const label = getLabelForTimestamp(ts, times, sessionLabels)
      if (label) {
        result[ts.toISO()] = labelMap[label] ?? DEFAULT_LABEL_MAP[label]
        break
      }
    }
  }
  return result
}

/**
 * Merge multiple market schedules by combining overlapping open/close intervals
 *
 * @param schedules - List of market schedules
 * @param how - 'outer' for union, 'inner' for intersection
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
 */
function getLabelForTimestamp(
  ts: DateTime,
  times: Record<string, DateTime>,
  labels: TradingSessionLabel[],
): TradingSessionLabel | undefined {
  const checks: Record<TradingSessionLabel, [DateTime, DateTime]> = {
    pre: [times['pre'], times['market_open']],
    rth_pre_break: [times['market_open'], times['break_start']],
    break: [times['break_start'], times['break_end']],
    rth_post_break: [times['break_end'], times['market_close']],
    rth: [times['market_open'], times['market_close']],
    post: [times['market_close'], times['post']],
    closed: [DateTime.fromMillis(0), DateTime.fromMillis(0)],
  }

  for (const label of labels) {
    const [start, end] = checks[label] || []
    if (start && end && ts >= start && ts <= end) {
      return label
    }
  }
  return 'closed'
}

function min(dates: DateTime[]): DateTime {
  return dates.reduce((a, b) => (a < b ? a : b))
}

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
        key = dt.toISODate()
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
  return holiday.startDate?.equals(holiday.endDate!)
    ? holiday.startDate
    : undefined
}

import { HolidayCalendar } from '@/core/HolidayCalendar'

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
    .map((rule) => isSingleObservance(rule))
    .filter(Boolean) as DateTime[]
  return dates.length === calendar.rules.length ? dates : undefined
}
