/**
 * Base class for all DateRange-related warnings
 */
export class DateRangeWarning extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DateRangeWarning'
  }
}

/**
 * Warning thrown when `dateRange` is called with a step/timedelta that is larger
 * than the gap between two sessions, causing overlaps.
 *
 * This is only an issue when `closed='right'`, `'both'`, or `undefined`, and `forceClose=null`.
 *
 * Example:
 * A 10:00 timestamp from the 'pre' session appears *after* the 9:30 start of 'RTH',
 * but belongs to 'pre'.
 */
export class OverlappingSessionWarning extends DateRangeWarning {
  constructor(message?: string) {
    super(
      message ??
        'Overlapping sessions detected due to large step size and relaxed closing rules.',
    )
    this.name = 'OverlappingSessionWarning'
  }
}

/**
 * Warning thrown when `dateRange` is called with a timedelta larger than the
 * total duration of a session — causing that session to disappear from the output.
 *
 * Only an issue when `closed='right'` and `forceClose=false`.
 */
export class DisappearingSessionWarning extends DateRangeWarning {
  constructor(message?: string) {
    super(
      message ??
        'Session disappeared from results due to step size larger than session duration.',
    )
    this.name = 'DisappearingSessionWarning'
  }
}

/**
 * Warning thrown when a `dateRange` call requests a session (e.g., 'pre'),
 * but the schedule lacks the required time columns.
 *
 * The returned range will simply skip those sessions.
 */
export class MissingSessionWarning extends DateRangeWarning {
  constructor(message?: string) {
    super(
      message ??
        'Schedule is missing required columns for requested session(s). Some sessions will be skipped.',
    )
    this.name = 'MissingSessionWarning'
  }
}

/**
 * Warning thrown when `dateRange` is called with a start/end date or period count
 * that exceeds the bounds of the available schedule.
 *
 * This warning may be thrown twice if both start and end dates are insufficient.
 *
 * If called with a number of periods, the start/end dates are estimated (usually overestimated)
 * to avoid repeated warning spam.
 */
export class InsufficientScheduleWarning extends DateRangeWarning {
  constructor(message?: string) {
    super(
      message ??
        'Requested date range exceeds bounds of available schedule. Some timestamps may be missing.',
    )
    this.name = 'InsufficientScheduleWarning'
  }
}
