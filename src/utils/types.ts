import { DateTime } from 'luxon'

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
