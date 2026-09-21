import { DateTime, Duration } from 'luxon'

/**
 * Labels for each trading session during a market day.
 */
export type TradingSessionLabel =
  | 'pre'
  | 'rth_pre_break'
  | 'rth'
  | 'break'
  | 'rth_post_break'
  | 'post'
  | 'closed'

/**
 * Extended session labels used in downstream logic.
 */
export type ExtendedTradingSessionLabel = TradingSessionLabel | 'closed_masked'

/**
 * A single day's trading schedule (used in markSession and merge logic).
 */
export interface MarketDaySchedule {
  date: DateTime
  market_open: DateTime
  market_close: DateTime
  [key: string]: DateTime
}

/**
 * A full schedule for multiple days.
 */
export type MarketSchedule = MarketDaySchedule[]

/**
 * Strategy for merging multiple schedules.
 */
export type MergeStrategy = 'outer' | 'inner'

/**
 * A session that `dateRange` can interpolate.
 *
 * The reference implementation also offers 'closed' and 'closed_masked', which
 * cover the gaps *between* sessions; those are not implemented here.
 */
export type DateRangeSession =
  | 'RTH'
  | 'ETH'
  | 'pre'
  | 'post'
  | 'break'
  | 'pre_break'
  | 'post_break'

/** How the interval endpoints of each session are labelled. */
export type IntervalClosed = 'left' | 'right' | 'both'

/** A bar size: seconds, a Luxon Duration, or a string such as '15min'. */
export type Frequency = number | Duration | string

/** A timestamp given as an ISO string, POSIX seconds, or a DateTime. */
export type TimestampLike = string | number | DateTime
