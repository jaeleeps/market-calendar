import { DateTime } from 'luxon'

/**
 * Base class for every warning the calendar utilities raise.
 */
export class CalendarWarning extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CalendarWarning'
  }
}

/**
 * Base class for warnings raised while interpolating a schedule.
 */
export class DateRangeWarning extends CalendarWarning {
  constructor(message: string) {
    super(message)
    this.name = 'DateRangeWarning'
  }
}

/**
 * Warning raised when merging schedules discards market times.
 *
 * Only the date, open and close survive a merge: a break or an
 * extended-hours session has no meaning across exchanges.
 */
export class DroppedMarketTimesWarning extends CalendarWarning {
  /** The columns left out of the merged schedule. */
  readonly columns: readonly string[]

  constructor(columns: string[]) {
    super(
      `Merging schedules drops ${columns.join(', ')}; only date, ` +
        'market_open and market_close are carried through.',
    )
    this.name = 'DroppedMarketTimesWarning'
    this.columns = columns
  }
}

/**
 * What to do when a warning is raised.
 *
 * 'warn' reports it on the console, 'ignore' drops it, and 'error' throws it so
 * a caller can catch it. JavaScript has no warning registry, so the reference
 * implementation's 'once' and 'default' actions have no equivalent here.
 */
export type WarningAction = 'warn' | 'ignore' | 'error'

/** Constructor of a warning class, used to key the action registry. */
type WarningClass = new (...args: never[]) => CalendarWarning

const actions = new Map<WarningClass, WarningAction>()

/**
 * Choose how a class of calendar warnings is reported.
 *
 * The most specific registration wins, so a rule for one subclass overrides a
 * rule set for a base class.
 *
 * @param action - How to report warnings of this class
 * @param source - The warning class to configure; defaults to all of them
 *
 * @example
 * filterCalendarWarnings('error', DisappearingSessionWarning)
 * filterCalendarWarnings('ignore', DateRangeWarning)
 */
export function filterCalendarWarnings(
  action: WarningAction,
  source: WarningClass = CalendarWarning as WarningClass,
): void {
  actions.set(source, action)
}

/** Restore every warning class to the default 'warn' action. */
export function resetCalendarWarnings(): void {
  actions.clear()
}

/**
 * Report a warning according to the configured action.
 *
 * @param warning - The warning to report
 * @throws The warning itself when its action is 'error'
 */
export function emitCalendarWarning(warning: CalendarWarning): void {
  let klass = warning.constructor as WarningClass | undefined
  let action: WarningAction | undefined

  // Walk the chain so the most specific registration wins.
  while (klass && !action) {
    action = actions.get(klass)
    klass = Object.getPrototypeOf(klass) as WarningClass | undefined
  }

  if (action === 'ignore') return
  if (action === 'error') throw warning
  console.warn(`${warning.name}: ${warning.message}`)
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
  /** The session dates whose last timestamp runs into the next session. */
  readonly dates: readonly string[]

  constructor(dates: string[]) {
    super(
      `The last timestamp of sessions on ${dates.join(', ')} falls after the ` +
        'start of the following session.',
    )
    this.name = 'OverlappingSessionWarning'
    this.dates = dates
  }
}

/**
 * Warning thrown when `dateRange` is called with a timedelta larger than the
 * total duration of a session — causing that session to disappear from the output.
 *
 * Only an issue when `closed='right'` and `forceClose=false`.
 */
export class DisappearingSessionWarning extends DateRangeWarning {
  /** The session dates that produced no timestamps. */
  readonly dates: readonly string[]

  constructor(dates: string[]) {
    super(
      `Sessions on ${dates.join(', ')} are shorter than the requested ` +
        'frequency and disappeared from the results.',
    )
    this.name = 'DisappearingSessionWarning'
    this.dates = dates
  }
}

/**
 * Warning thrown when a `dateRange` call requests a session (e.g., 'pre'),
 * but the schedule lacks the required time columns.
 *
 * The returned range will simply skip those sessions.
 */
export class MissingSessionWarning extends DateRangeWarning {
  /** The sessions that had to be skipped. */
  readonly sessions: readonly string[]

  /** The schedule columns they needed. */
  readonly columns: readonly string[]

  constructor(sessions: string[], columns: string[]) {
    super(
      `Schedule is missing ${columns.join(', ')}, so session(s) ` +
        `${sessions.join(', ')} will be skipped.`,
    )
    this.name = 'MissingSessionWarning'
    this.sessions = sessions
    this.columns = columns
  }
}

/**
 * Warning raised when the schedule cannot cover what was asked for: a start
 * before it begins, an end after it finishes, or more periods than it yields.
 */
export class InsufficientScheduleWarning extends DateRangeWarning {
  /** True when the schedule falls short at its start, false at its end. */
  readonly atStart: boolean

  /** The bound that was asked for, or the number of periods. */
  readonly requested: DateTime | number

  /** The bound the schedule reaches, or the number of periods it yields. */
  readonly available: DateTime | number

  constructor(
    atStart: boolean,
    requested: DateTime | number,
    available: DateTime | number,
  ) {
    super(
      typeof requested === 'number' || typeof available === 'number'
        ? `Requested ${requested} periods but the schedule yields ${String(available)}.`
        : `Schedule ${atStart ? 'begins' : 'ends'} at ${available.toISO()}, ` +
            `but ${atStart ? 'a start' : 'an end'} of ${requested.toISO()} was requested.`,
    )
    this.name = 'InsufficientScheduleWarning'
    this.atStart = atStart
    this.requested = requested
    this.available = available
  }
}
