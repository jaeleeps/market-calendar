import { test } from '@japa/runner'
import { DateTime, Duration } from 'luxon'
import {
  getCalendar,
  calendarNames,
  NYSE,
  CMEBond,
  CMEEquity,
  JPX,
  LSE,
  TSX,
} from '../src'
import {
  Interruption,
  MarketCalendar,
  OpenAtTimeOptions,
  TimeOfDay,
} from '../src/core/MarketCalendar'
import { ProtectedDict } from '../src/core/classRegistry'
import { Dated } from '../src/utils/dated'

/** A calendar that halted trading, following the reference docstring's shape. */
class HaltingMarket extends MarketCalendar {
  readonly name = 'HALT'
  readonly tz = 'UTC'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [9, 30] }]],
    ['market_close', [{ from: null, value: [16, 0] }]],
  ])

  override interruptions: Interruption[] = [
    {
      date: '2024-07-02',
      spans: [
        [
          [9, 59],
          [10, 0],
        ],
        [
          [10, 29],
          [10, 30],
        ],
      ],
    },
    // A halt that runs past midnight, using a day offset on its end.
    {
      date: '2024-07-03',
      spans: [
        [
          [11, 0],
          [11, 2, 1],
        ],
      ],
    },
  ]
}

/** A calendar whose session opens the evening before, as CME's do. */
class OvernightMarket extends MarketCalendar {
  readonly name = 'OVERNIGHT'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [17, 0, -1] }]],
    ['market_close', [{ from: null, value: [16, 0] }]],
  ])
}

/** A calendar that dropped its lunch break at the start of 2020. */
class RetiredBreakMarket extends MarketCalendar {
  readonly name = 'RETIRED'
  readonly tz = 'UTC'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [9, 0] }]],
    [
      'break_start',
      [
        { from: null, value: [12, 0] },
        { from: '2020-01-01', value: null },
      ],
    ],
    [
      'break_end',
      [
        { from: null, value: [13, 0] },
        { from: '2020-01-01', value: null },
      ],
    ],
    ['market_close', [{ from: null, value: [17, 0] }]],
  ])
}

/** A calendar with a lunch break, which no ported exchange has yet. */
class BreakMarket extends MarketCalendar {
  readonly name = 'BREAK'
  readonly tz = 'America/New_York'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay>[]>([
    ['market_open', [{ from: null, value: [9, 0] }]],
    ['break_start', [{ from: null, value: [11, 30] }]],
    ['break_end', [{ from: null, value: [12, 30] }]],
    ['market_close', [{ from: null, value: [15, 0] }]],
  ])
}
import { weekdayOffset, easterSunday } from '../src/utils/rules'
import { Weekday } from '../src/utils/constants'
import { saturdays } from '../src/holidays/nyse'
import {
  convertFreq,
  dateRange,
  dateRangeHTF,
  markSession,
  mergeSchedules,
} from '../src/utils/calendarUtils'
import {
  DateRangeWarning,
  DroppedMarketTimesWarning,
  InsufficientScheduleWarning,
  MissingSessionWarning,
  filterCalendarWarnings,
  resetCalendarWarnings,
} from '../src/utils/warnings'
import { DateRangeSession } from '../src/utils/types'

const nyse = () => new NYSE()
const iso = (dates: DateTime[]) => dates.map((d) => d.toISODate())
const et = (s: string) => DateTime.fromISO(s, { zone: 'America/New_York' })

test.group('offset rules', () => {
  test('rolls forward counting the date itself', ({ assert }) => {
    // MLK Day 2024: 3rd Monday on or after Jan 1 (which is itself a Monday).
    assert.equal(
      weekdayOffset(Weekday.MONDAY, 3)(DateTime.utc(2024, 1, 1)).toISODate(),
      '2024-01-15',
    )
    // Memorial Day 2024: Monday on or after May 25 (a Saturday).
    assert.equal(
      weekdayOffset(Weekday.MONDAY, 1)(DateTime.utc(2024, 5, 25)).toISODate(),
      '2024-05-27',
    )
  })

  test('rolls backward for negative occurrences', ({ assert }) => {
    assert.equal(
      weekdayOffset(
        Weekday.THURSDAY,
        -1,
      )(DateTime.utc(1930, 11, 30)).toISODate(),
      '1930-11-27',
    )
  })

  test('computes Gregorian Easter', ({ assert }) => {
    assert.equal(easterSunday(2024).toISODate(), '2024-03-31')
    assert.equal(easterSunday(2025).toISODate(), '2025-04-20')
  })
})

test.group('calendar registry', () => {
  test('resolves NYSE by name and alias', ({ assert }) => {
    assert.equal(getCalendar('XNYS').name, 'NYSE')
    assert.equal(getCalendar('nyse').name, 'NYSE')
    assert.includeMembers(calendarNames(), ['XNYS', 'NYSE'])
  })

  test('rejects unknown calendars', ({ assert }) => {
    assert.throws(() => getCalendar('NOPE'), /not registered/)
  })
})

test.group('NYSE holidays', () => {
  test('matches the 2024 holiday list', ({ assert }) => {
    assert.deepEqual(iso(nyse().holidays('2024-01-01', '2024-12-31')), [
      '2024-01-01', // New Year's Day
      '2024-01-15', // MLK Day
      '2024-02-19', // Presidents' Day
      '2024-03-29', // Good Friday
      '2024-05-27', // Memorial Day
      '2024-06-19', // Juneteenth
      '2024-07-04', // Independence Day
      '2024-09-02', // Labor Day
      '2024-11-28', // Thanksgiving
      '2024-12-25', // Christmas
    ])
  })

  test('honours dated rules across eras', ({ assert }) => {
    // MLK Day is only observed from 1998.
    assert.notInclude(
      iso(nyse().holidays('1997-01-01', '1997-01-31')),
      '1997-01-20',
    )
    assert.include(
      iso(nyse().holidays('1998-01-01', '1998-01-31')),
      '1998-01-19',
    )
    // Juneteenth is only observed from 2022.
    assert.notInclude(
      iso(nyse().holidays('2021-06-01', '2021-06-30')),
      '2021-06-18',
    )
    assert.include(
      iso(nyse().holidays('2022-06-01', '2022-06-30')),
      '2022-06-20',
    )
  })

  test('includes adhoc closures', ({ assert }) => {
    assert.deepEqual(iso(nyse().holidays('2012-10-28', '2012-10-31')), [
      '2012-10-29',
      '2012-10-30',
    ])
    // Closed Sept 11-14; the exchange reopened on Monday Sept 17.
    assert.deepEqual(iso(nyse().validDays('2001-09-10', '2001-09-17')), [
      '2001-09-10',
      '2001-09-17',
    ])
  })
})

test.group('NYSE schedule', () => {
  test('excludes weekends and holidays', ({ assert }) => {
    assert.deepEqual(iso(nyse().validDays('2024-06-28', '2024-07-08')), [
      '2024-06-28',
      '2024-07-01',
      '2024-07-02',
      '2024-07-03',
      '2024-07-05',
      '2024-07-08',
    ])
  })

  test('uses 09:30-16:00 Eastern on a regular day', ({ assert }) => {
    const [day] = nyse().schedule('2024-07-02', '2024-07-02')
    assert.equal(day.market_open.toISO(), '2024-07-02T09:30:00.000-04:00')
    assert.equal(day.market_close.toISO(), '2024-07-02T16:00:00.000-04:00')
  })

  test('applies special closes', ({ assert }) => {
    const byDate = new Map(
      nyse()
        .schedule('2024-01-01', '2024-12-31')
        .map((d) => [d.date.toISODate(), d.market_close.toFormat('HH:mm')]),
    )
    assert.equal(byDate.get('2024-07-03'), '13:00') // Wednesday before July 4th
    assert.equal(byDate.get('2024-11-29'), '13:00') // Black Friday
    assert.equal(byDate.get('2024-12-24'), '13:00') // Christmas Eve
    assert.equal(byDate.get('2024-12-23'), '16:00') // regular day
  })

  test('closes at 14:00 for pre-1993 Christmas Eve', ({ assert }) => {
    const [day] = nyse().schedule('1992-12-24', '1992-12-24')
    assert.equal(day.market_close.toFormat('HH:mm'), '14:00')
  })

  test('respects daylight saving boundaries', ({ assert }) => {
    const [before, after] = nyse().schedule('2024-11-01', '2024-11-04')
    assert.equal(before.market_open.toISO(), '2024-11-01T09:30:00.000-04:00')
    assert.equal(after.market_open.toISO(), '2024-11-04T09:30:00.000-05:00')
  })
})

test.group('historical market times', () => {
  const hours = (date: string) => {
    const [day] = nyse().schedule(date, date)
    return `${day.market_open.toFormat('HH:mm')}-${day.market_close.toFormat('HH:mm')}`
  }

  test('uses the open in effect on the date', ({ assert }) => {
    // The open moved from 10:00 to 09:30 on 1985-01-01, itself a holiday.
    assert.equal(hours('1984-12-31'), '10:00-16:00')
    assert.equal(hours('1985-01-02'), '09:30-16:00')
  })

  test('uses the close in effect on the date', ({ assert }) => {
    assert.equal(hours('1952-09-26'), '10:00-15:00')
    assert.equal(hours('1952-09-29'), '10:00-15:30')
    assert.equal(hours('1973-12-31'), '10:00-15:30')
    assert.equal(hours('1974-01-02'), '10:00-16:00')
  })

  test('reports the current and the historical time', ({ assert }) => {
    const cal = nyse()
    assert.deepEqual(cal.getTime('market_open'), [9, 30])
    assert.deepEqual(cal.getTimeOn('market_open', '1970-06-01'), [10, 0])
    assert.deepEqual(cal.getTimeOn('market_close', '1970-06-01'), [15, 30])
  })

  test('leaves the modern era untouched', ({ assert }) => {
    assert.equal(hours('2024-07-02'), '09:30-16:00')
  })
})

test.group('historical weekmask', () => {
  test('trades Saturdays until 1952-09-29', ({ assert }) => {
    // 1950-01-07 and 1952-05-24 are both Saturdays outside the summer
    // shutdowns; 1952-10-04 falls after Saturday trading ended.
    assert.deepEqual(iso(nyse().validDays('1950-01-07', '1950-01-07')), [
      '1950-01-07',
    ])
    assert.deepEqual(iso(nyse().validDays('1952-05-24', '1952-05-24')), [
      '1952-05-24',
    ])
    assert.deepEqual(iso(nyse().validDays('1952-10-04', '1952-10-04')), [])
  })

  test('closes Saturday sessions at noon', ({ assert }) => {
    const [day] = nyse().schedule('1950-01-07', '1950-01-07')
    assert.equal(day.market_open.toFormat('HH:mm'), '10:00')
    assert.equal(day.market_close.toFormat('HH:mm'), '12:00')
  })

  test('spans the transition within one range', ({ assert }) => {
    const days = iso(nyse().validDays('1952-05-24', '1952-10-04'))
    assert.include(days, '1952-05-24') //    Saturday trading still running
    assert.notInclude(days, '1952-10-04') // after it ended
    // 1952-09-27 is a Saturday before the cutoff but still not a session: it
    // falls in that summer's shutdown, which is a closure, not the weekmask.
    assert.notInclude(days, '1952-09-27')
  })

  test('still excludes Sundays and modern Saturdays', ({ assert }) => {
    assert.deepEqual(iso(nyse().validDays('1950-01-08', '1950-01-08')), [])
    assert.deepEqual(iso(nyse().validDays('2024-07-06', '2024-07-07')), [])
  })
})

test.group('openAtTime', () => {
  const cal = nyse()
  const open = (at: string, options: OpenAtTimeOptions = {}) =>
    cal.openAtTime(et(at), options)

  test('counts the extended sessions by default', ({ assert }) => {
    assert.isFalse(open('2024-07-02T03:59')) // before the pre session
    assert.isTrue(open('2024-07-02T04:00')) //  pre opens the market
    assert.isTrue(open('2024-07-02T09:29'))
    assert.isTrue(open('2024-07-02T16:00')) //  post takes over from the close
    assert.isTrue(open('2024-07-02T18:00'))
    assert.isFalse(open('2024-07-02T20:00')) // post ends the day
    assert.isFalse(open('2024-07-02T20:01'))
  })

  test('onlyRTH asks about regular hours alone', ({ assert }) => {
    const rth = { onlyRTH: true }
    assert.isFalse(open('2024-07-02T09:29', rth))
    assert.isTrue(open('2024-07-02T09:30', rth))
    assert.isTrue(open('2024-07-02T15:59', rth))
    assert.isFalse(open('2024-07-02T16:00', rth)) // the close is not open
    assert.isFalse(open('2024-07-02T18:00', rth))
  })

  test('includeClose counts the closing instant', ({ assert }) => {
    assert.isTrue(open('2024-07-02T20:00', { includeClose: true }))
    assert.isTrue(
      open('2024-07-02T16:00', { onlyRTH: true, includeClose: true }),
    )
    assert.isFalse(
      open('2024-07-02T16:01', { onlyRTH: true, includeClose: true }),
    )
  })

  test('is closed on holidays and weekends', ({ assert }) => {
    assert.isFalse(open('2024-07-04T10:00')) // Independence Day
    assert.isFalse(open('2024-07-06T10:00')) // Saturday
  })

  test('follows an early close', ({ assert }) => {
    assert.isTrue(open('2024-07-03T12:59', { onlyRTH: true }))
    assert.isFalse(open('2024-07-03T13:01', { onlyRTH: true }))
    assert.isTrue(open('2024-07-03T15:00')) // the post session runs to 17:00
    assert.isFalse(open('2024-07-03T17:00'))
  })

  test('reads a lunch break as closed', ({ assert }) => {
    const lunch = new BreakMarket()
    assert.isTrue(lunch.openAtTime(et('2024-07-02T11:29')))
    assert.isFalse(lunch.openAtTime(et('2024-07-02T11:30'))) // break starts
    assert.isFalse(lunch.openAtTime(et('2024-07-02T12:00')))
    assert.isTrue(lunch.openAtTime(et('2024-07-02T12:30'))) // and ends
    assert.isTrue(lunch.openAtTime(et('2024-07-02T14:00')))
  })

  test('isOpenNow agrees with openAtTime now', ({ assert }) => {
    assert.equal(cal.isOpenNow(), cal.openAtTime(DateTime.now()))
    assert.equal(
      cal.isOpenNow({ onlyRTH: true }),
      cal.openAtTime(DateTime.now(), { onlyRTH: true }),
    )
  })
})

test.group('schedule differences', () => {
  const cal = nyse()
  const july = () => cal.schedule('2024-07-01', '2024-07-31')
  const dates = (schedule: ReturnType<typeof july>) =>
    schedule.map((d) => d.date.toISODate())

  test('finds the early closes', ({ assert }) => {
    // 3 July is the only NYSE half-day in the month.
    assert.deepEqual(dates(cal.earlyCloses(july())), ['2024-07-03'])
  })

  test('finds no late opens where there are none', ({ assert }) => {
    assert.deepEqual(cal.lateOpens(july()), [])
  })

  test('reports any difference by default', ({ assert }) => {
    assert.deepEqual(dates(cal.isDifferent(july(), 'market_close')), [
      '2024-07-03',
    ])
    assert.deepEqual(dates(cal.isDifferent(july(), 'post')), ['2024-07-03'])
    assert.deepEqual(cal.isDifferent(july(), 'market_open'), [])
  })

  test('takes a custom comparison', ({ assert }) => {
    const later = cal.isDifferent(
      july(),
      'market_close',
      (observed, regular) => observed > regular,
    )
    assert.deepEqual(later, [])
  })
})

test.group('extended hours', () => {
  const columns = (date: string) => {
    const [day] = nyse().schedule(date, date)
    return {
      pre: day.pre?.toFormat('HH:mm'),
      open: day.market_open.toFormat('HH:mm'),
      close: day.market_close.toFormat('HH:mm'),
      post: day.post?.toFormat('HH:mm'),
    }
  }

  test('publishes pre and post alongside regular hours', ({ assert }) => {
    assert.deepEqual(columns('2024-07-02'), {
      pre: '04:00',
      open: '09:30',
      close: '16:00',
      post: '20:00',
    })
  })

  test('shortens the post session on 13:00 early closes', ({ assert }) => {
    assert.deepEqual(columns('2024-07-03'), {
      pre: '04:00',
      open: '09:30',
      close: '13:00',
      post: '17:00',
    })
    assert.deepEqual(columns('2024-11-29'), {
      pre: '04:00',
      open: '09:30',
      close: '13:00',
      post: '17:00',
    })
  })

  test('conforms the post session to a 14:00 close', ({ assert }) => {
    // The pre-1993 Christmas Eve close is not one of the 1pm rules, so post
    // has no special of its own and is pulled back to the early close.
    assert.deepEqual(columns('1992-12-24'), {
      pre: '04:00',
      open: '09:30',
      close: '14:00',
      post: '14:00',
    })
  })

  test('openAtTime counts the extended sessions', ({ assert }) => {
    const cal = nyse()
    assert.isTrue(cal.openAtTime(et('2024-07-02T05:00'))) // pre-market
    assert.isTrue(cal.openAtTime(et('2024-07-02T10:00')))
    assert.isTrue(cal.openAtTime(et('2024-07-02T18:00'))) // post-market
    assert.isFalse(cal.openAtTime(et('2024-07-02T05:00'), { onlyRTH: true }))
  })
})

test.group('markSession', () => {
  test('labels every session of a regular day', ({ assert }) => {
    const schedule = nyse().schedule('2024-07-02', '2024-07-02')
    const stamps = [
      et('2024-07-02T05:00'),
      et('2024-07-02T10:00'),
      et('2024-07-02T18:00'),
      et('2024-07-02T21:00'),
    ]

    assert.deepEqual(Object.values(markSession(schedule, stamps)), [
      'pre',
      'rth',
      'post',
      'closed',
    ])
  })

  test('follows the shortened sessions of an early close', ({ assert }) => {
    const schedule = nyse().schedule('2024-07-03', '2024-07-03')
    const stamps = [
      et('2024-07-03T12:00'), // before the 13:00 close
      et('2024-07-03T15:00'), // post runs until 17:00 on early closes
      et('2024-07-03T18:00'), // past it
    ]

    assert.deepEqual(Object.values(markSession(schedule, stamps)), [
      'rth',
      'post',
      'closed',
    ])
  })

  test('labels timestamps against their own session day', ({ assert }) => {
    const schedule = nyse().schedule('2024-07-02', '2024-07-05')
    const stamps = [
      et('2024-07-02T10:00'),
      et('2024-07-04T10:00'), // holiday, not in the schedule
      et('2024-07-05T10:00'),
    ]

    assert.deepEqual(Object.values(markSession(schedule, stamps)), [
      'rth',
      'closed',
      'rth',
    ])
  })
})

test.group('dateRange', (group) => {
  group.each.teardown(() => resetCalendarWarnings())

  const day = (date: string) => nyse().schedule(date, date)
  const hhmm = (stamps: DateTime[]) => stamps.map((t) => t.toFormat('HH:mm'))

  test('reproduces the reference implementation example', ({ assert }) => {
    const sched = day('2020-01-02')
    const opts = {
      session: ['RTH', 'ETH'] as DateRangeSession[],
      closed: 'left' as const,
      forceClose: false,
    }

    assert.deepEqual(hhmm(dateRange(sched, '2h', { ...opts })), [
      '04:00',
      '06:00',
      '08:00',
      '10:00',
      '12:00',
      '14:00',
      '16:00',
      '18:00',
    ])
    assert.deepEqual(
      hhmm(dateRange(sched, '2h', { ...opts, mergeAdjacent: false })),
      [
        '04:00',
        '06:00',
        '08:00',
        '09:30',
        '11:30',
        '13:30',
        '15:30',
        '16:00',
        '18:00',
      ],
    )
  })

  test('labels intervals per the closed option', ({ assert }) => {
    const sched = day('2024-07-02')
    assert.deepEqual(hhmm(dateRange(sched, '1h', { closed: 'left' })), [
      '09:30',
      '10:30',
      '11:30',
      '12:30',
      '13:30',
      '14:30',
      '15:30',
    ])
    assert.deepEqual(hhmm(dateRange(sched, '1h', { closed: 'right' })), [
      '10:30',
      '11:30',
      '12:30',
      '13:30',
      '14:30',
      '15:30',
      '16:00',
    ])
    assert.deepEqual(hhmm(dateRange(sched, '1h', { closed: 'both' })), [
      '09:30',
      '10:30',
      '11:30',
      '12:30',
      '13:30',
      '14:30',
      '15:30',
      '16:00',
    ])
  })

  test('handles a grid that overshoots the close', ({ assert }) => {
    // RTH is 6.5h, so an hourly grid lands on 16:30.
    const sched = day('2024-07-02')
    const last = (forceClose: boolean | null) =>
      hhmm(dateRange(sched, '1h', { closed: 'right', forceClose })).pop()

    assert.equal(last(true), '16:00') // pinned to the close
    assert.equal(last(false), '15:30') // overshooting bar dropped
    assert.equal(last(null), '16:30') // left as calculated
  })

  test('accepts seconds, strings and Durations', ({ assert }) => {
    const sched = day('2024-07-02')
    const expected = hhmm(dateRange(sched, 3600, { closed: 'left' }))

    assert.deepEqual(hhmm(dateRange(sched, '1h', { closed: 'left' })), expected)
    assert.deepEqual(
      hhmm(dateRange(sched, '60min', { closed: 'left' })),
      expected,
    )
    assert.deepEqual(
      hhmm(
        dateRange(sched, Duration.fromObject({ hours: 1 }), { closed: 'left' }),
      ),
      expected,
    )
  })

  test('rejects unusable frequencies', ({ assert }) => {
    const sched = day('2024-07-02')
    assert.throws(() => dateRange(sched, 'fortnightly'), /Invalid frequency/)
    assert.throws(() => dateRange(sched, 0), /positive duration/)
    assert.throws(() => dateRange(sched, '2d'), /longer than a day/)
  })

  test('warns when a session vanishes', ({ assert }) => {
    // The July 3rd half-day is 3.5h, shorter than the 4h frequency.
    filterCalendarWarnings('error')
    assert.throws(
      () =>
        dateRange(day('2024-07-03'), '4h', {
          closed: 'right',
          forceClose: false,
        }),
      /disappeared/,
    )
  })

  test('warns when a session runs into the next', ({ assert }) => {
    filterCalendarWarnings('error')
    assert.throws(
      () =>
        dateRange(day('2024-07-02'), '6h', {
          session: ['pre', 'RTH'],
          closed: 'right',
          forceClose: null,
          mergeAdjacent: false,
        }),
      /falls after the start of the following session/,
    )
  })

  test('warns when the schedule lacks a session', ({ assert }) => {
    filterCalendarWarnings('error')
    try {
      dateRange(day('2024-07-02'), '1h', { session: 'break' })
      assert.fail('expected a MissingSessionWarning')
    } catch (err) {
      assert.instanceOf(err, MissingSessionWarning)
      assert.deepEqual([...(err as MissingSessionWarning).sessions], ['break'])
      assert.includeMembers(
        [...(err as MissingSessionWarning).columns],
        ['break_start', 'break_end'],
      )
    }
  })

  test('honours the ignore filter', ({ assert }) => {
    filterCalendarWarnings('ignore')
    assert.deepEqual(
      dateRange(day('2024-07-02'), '1h', { session: 'break' }),
      [],
    )
  })

  test('splits regular hours around a lunch break', ({ assert }) => {
    const at = (t: string) => et(`2024-07-02T${t}`)
    const sched = [
      {
        date: at('00:00'),
        market_open: at('09:00'),
        break_start: at('11:30'),
        break_end: at('12:30'),
        market_close: at('15:00'),
      },
    ]

    assert.deepEqual(hhmm(dateRange(sched, '1h', { closed: 'left' })), [
      '09:00',
      '10:00',
      '11:00',
      '12:30',
      '13:30',
      '14:30',
    ])
    assert.deepEqual(
      hhmm(dateRange(sched, '1h', { session: 'break', closed: 'left' })),
      ['11:30'],
    )
  })
})

test.group('mergeSchedules', (group) => {
  group.each.teardown(() => resetCalendarWarnings())

  const at = (date: string, time: string) =>
    DateTime.fromISO(`${date}T${time}`, { zone: 'UTC' })

  const session = (date: string, open: string, close: string) => ({
    date: at(date, '00:00'),
    market_open: at(date, open),
    market_close: at(date, close),
  })

  const shape = (schedule: ReturnType<typeof mergeSchedules>) =>
    schedule.map(
      (d) =>
        `${d.date.toISODate()} ${d.market_open.toFormat('HH:mm')}-${d.market_close.toFormat('HH:mm')}`,
    )

  // Monday and Tuesday for one market, Tuesday and Wednesday for the other.
  const a = [
    session('2024-07-01', '09:00', '16:00'),
    session('2024-07-02', '09:00', '16:00'),
  ]
  const b = [
    session('2024-07-02', '10:00', '17:00'),
    session('2024-07-03', '10:00', '17:00'),
  ]

  test('outer spans every day either market trades', ({ assert }) => {
    assert.deepEqual(shape(mergeSchedules([a, b], 'outer')), [
      '2024-07-01 09:00-16:00', // only market A
      '2024-07-02 09:00-17:00', // earliest open, latest close
      '2024-07-03 10:00-17:00', // only market B
    ])
  })

  test('outer is the default', ({ assert }) => {
    assert.deepEqual(
      shape(mergeSchedules([a, b])),
      shape(mergeSchedules([a, b], 'outer')),
    )
  })

  test('inner keeps only days both markets trade', ({ assert }) => {
    assert.deepEqual(shape(mergeSchedules([a, b], 'inner')), [
      '2024-07-02 10:00-16:00', // latest open, earliest close
    ])
  })

  test('inner drops days with no overlap', ({ assert }) => {
    const morning = [session('2024-07-02', '09:00', '12:00')]
    const afternoon = [session('2024-07-02', '13:00', '16:00')]
    assert.deepEqual(mergeSchedules([morning, afternoon], 'inner'), [])
    assert.deepEqual(shape(mergeSchedules([morning, afternoon], 'outer')), [
      '2024-07-02 09:00-16:00',
    ])
  })

  test('merges more than two schedules', ({ assert }) => {
    const c = [session('2024-07-02', '08:00', '15:00')]
    assert.deepEqual(shape(mergeSchedules([a, b, c], 'outer')), [
      '2024-07-01 09:00-16:00',
      '2024-07-02 08:00-17:00',
      '2024-07-03 10:00-17:00',
    ])
    assert.deepEqual(shape(mergeSchedules([a, b, c], 'inner')), [
      '2024-07-02 10:00-15:00',
    ])
  })

  test('drops market times a merge cannot carry', ({ assert }) => {
    filterCalendarWarnings('ignore')
    const merged = mergeSchedules([nyse().schedule('2024-07-02', '2024-07-02')])
    assert.deepEqual(Object.keys(merged[0]).sort(), [
      'date',
      'market_close',
      'market_open',
    ])
  })

  test('raises a filterable warning for the dropped columns', ({ assert }) => {
    filterCalendarWarnings('error')
    try {
      mergeSchedules([nyse().schedule('2024-07-02', '2024-07-02')])
      assert.fail('expected a DroppedMarketTimesWarning')
    } catch (err) {
      assert.instanceOf(err, DroppedMarketTimesWarning)
      assert.deepEqual(
        [...(err as DroppedMarketTimesWarning).columns],
        ['post', 'pre'],
      )
    }
  })

  test('is not silenced by a date range filter', ({ assert }) => {
    // The merge warning is not a DateRangeWarning, so that filter must miss it.
    filterCalendarWarnings('ignore', DateRangeWarning)
    filterCalendarWarnings('error', DroppedMarketTimesWarning)
    assert.throws(
      () => mergeSchedules([nyse().schedule('2024-07-02', '2024-07-02')]),
      /Merging schedules drops/,
    )
  })

  test('handles empty input and rejects a bad strategy', ({ assert }) => {
    assert.deepEqual(mergeSchedules([], 'outer'), [])
    assert.throws(
      () => mergeSchedules([a], 'sideways' as 'inner'),
      /must be "outer" or "inner"/,
    )
  })
})

test.group('dateRange limits', (group) => {
  group.each.teardown(() => resetCalendarWarnings())

  const sched = () => nyse().schedule('2024-07-01', '2024-07-01')
  const hhmm = (stamps: DateTime[]) => stamps.map((t) => t.toFormat('HH:mm'))
  const bars = (options: object = {}) =>
    hhmm(dateRange(sched(), '1h', { closed: 'left', ...options }))

  test('returns the whole session by default', ({ assert }) => {
    assert.deepEqual(bars(), [
      '09:30',
      '10:30',
      '11:30',
      '12:30',
      '13:30',
      '14:30',
      '15:30',
    ])
  })

  test('selects from the grid rather than moving it', ({ assert }) => {
    // 11:00 is between bars, so the next bar on the grid is returned.
    assert.deepEqual(bars({ start: '2024-07-01T11:00' }), [
      '11:30',
      '12:30',
      '13:30',
      '14:30',
      '15:30',
    ])
    assert.deepEqual(bars({ end: '2024-07-01T11:00' }), ['09:30', '10:30'])
    assert.deepEqual(
      bars({ start: '2024-07-01T11:00', end: '2024-07-01T13:30' }),
      ['11:30', '12:30', '13:30'],
    )
  })

  test('matches the reference implementation start example', ({ assert }) => {
    // Docstring: session [9:30, 12:00], frequency 7min, start 9:45 =>
    // underlying grid [9:30, 9:37, 9:44, 9:51, ...] so the result opens at 9:51.
    const at = (t: string) => et(`2024-07-01T${t}`)
    const session = [
      {
        date: at('00:00'),
        market_open: at('09:30'),
        market_close: at('12:00'),
      },
    ]

    const stamps = dateRange(session, '7min', {
      closed: 'left',
      start: '2024-07-01T09:45',
    })
    assert.deepEqual(hhmm(stamps).slice(0, 3), ['09:51', '09:58', '10:05'])
  })

  test('reads bounds as ISO strings, seconds or DateTimes', ({ assert }) => {
    const noon = et('2024-07-01T12:00')
    assert.deepEqual(bars({ start: noon }), bars({ start: '2024-07-01T12:00' }))
    assert.deepEqual(
      bars({ start: noon.toSeconds() }),
      bars({ start: '2024-07-01T12:00' }),
    )
  })

  test('takes periods forward from the start', ({ assert }) => {
    assert.deepEqual(bars({ periods: 3 }), ['09:30', '10:30', '11:30'])
    assert.deepEqual(bars({ start: '2024-07-01T11:00', periods: 2 }), [
      '11:30',
      '12:30',
    ])
    assert.deepEqual(bars({ periods: 0 }), [])
  })

  test('takes periods backward from the end', ({ assert }) => {
    assert.deepEqual(bars({ end: '2024-07-01T13:30', periods: 2 }), [
      '12:30',
      '13:30',
    ])
  })

  test('ignores periods when both bounds are given', ({ assert }) => {
    assert.deepEqual(
      bars({ start: '2024-07-01T11:00', end: '2024-07-01T13:30', periods: 1 }),
      ['11:30', '12:30', '13:30'],
    )
  })

  test('warns when the schedule starts too late', ({ assert }) => {
    filterCalendarWarnings('error')
    try {
      dateRange(sched(), '1h', { start: '2024-06-28T09:30' })
      assert.fail('expected an InsufficientScheduleWarning')
    } catch (err) {
      assert.instanceOf(err, InsufficientScheduleWarning)
      assert.isTrue((err as InsufficientScheduleWarning).atStart)
      assert.match((err as InsufficientScheduleWarning).message, /begins at/)
    }
  })

  test('warns when the schedule ends too early', ({ assert }) => {
    filterCalendarWarnings('error')
    try {
      dateRange(sched(), '1h', { end: '2024-07-05T16:00' })
      assert.fail('expected an InsufficientScheduleWarning')
    } catch (err) {
      assert.instanceOf(err, InsufficientScheduleWarning)
      assert.isFalse((err as InsufficientScheduleWarning).atStart)
    }
  })

  test('warns when it cannot yield enough periods', ({ assert }) => {
    filterCalendarWarnings('error')
    try {
      dateRange(sched(), '1h', { closed: 'left', periods: 99 })
      assert.fail('expected an InsufficientScheduleWarning')
    } catch (err) {
      assert.instanceOf(err, InsufficientScheduleWarning)
      assert.equal((err as InsufficientScheduleWarning).requested, 99)
      assert.equal((err as InsufficientScheduleWarning).available, 7)
    }
  })

  test('still returns what it has when short', ({ assert }) => {
    filterCalendarWarnings('ignore')
    assert.lengthOf(
      dateRange(sched(), '1h', { closed: 'left', periods: 99 }),
      7,
    )
  })

  test('rejects impossible bounds', ({ assert }) => {
    filterCalendarWarnings('ignore')
    assert.throws(
      () => bars({ start: '2024-07-01T14:00', end: '2024-07-01T10:00' }),
      /is after end/,
    )
    assert.throws(() => bars({ periods: -1 }), /non-negative integer/)
    assert.throws(() => bars({ start: 'not-a-date' }), /Invalid timestamp/)
  })
})

test.group('dateRange closed sessions', () => {
  const stamps = (s: DateTime[]) => s.map((t) => t.toFormat('ccc HH:mm'))

  test('spans from one day’s last market time to the next day’s first', ({
    assert,
  }) => {
    // NYSE publishes pre and post, so the gap runs post -> next pre.
    const sched = nyse().schedule('2024-07-01', '2024-07-02')
    assert.deepEqual(
      stamps(dateRange(sched, '1h', { session: 'closed', closed: 'left' })),
      [
        'Mon 20:00',
        'Mon 21:00',
        'Mon 22:00',
        'Mon 23:00',
        'Tue 00:00',
        'Tue 01:00',
        'Tue 02:00',
        'Tue 03:00',
        // The last day never reopens in this schedule, so it runs to midnight.
        'Tue 20:00',
        'Tue 21:00',
        'Tue 22:00',
        'Tue 23:00',
      ],
    )
  })

  test('runs straight through a holiday when unmasked', ({ assert }) => {
    // 4 July is a holiday, and 3 July closes early so post is 17:00.
    const sched = nyse().schedule('2024-07-03', '2024-07-05')
    assert.deepEqual(
      stamps(dateRange(sched, '4h', { session: 'closed', closed: 'left' })),
      [
        'Wed 17:00',
        'Wed 21:00',
        'Thu 01:00',
        'Thu 05:00',
        'Thu 09:00',
        'Thu 13:00',
        'Thu 17:00',
        'Thu 21:00',
        'Fri 01:00',
        'Fri 20:00',
      ],
    )
  })

  test('masking leaves the closed days out entirely', ({ assert }) => {
    const sched = nyse().schedule('2024-07-03', '2024-07-05')
    assert.deepEqual(
      stamps(
        dateRange(sched, '4h', { session: 'closed_masked', closed: 'left' }),
      ),
      [
        'Wed 17:00',
        'Wed 21:00', // stops at midnight after the trading day
        'Fri 00:00', //              resumes at midnight before the next one
        'Fri 20:00',
      ],
    )
  })

  test('masking a weekend keeps Saturday and Sunday out', ({ assert }) => {
    const sched = nyse().schedule('2024-07-05', '2024-07-08')
    const masked = stamps(
      dateRange(sched, '1h', { session: 'closed_masked', closed: 'left' }),
    )
    assert.notInclude(masked, 'Sat 00:00')
    assert.notInclude(masked, 'Sun 12:00')
    assert.include(masked, 'Fri 23:00')
    assert.include(masked, 'Mon 00:00')
  })

  test('falls back to the open and close without extended hours', ({
    assert,
  }) => {
    const on = (date: string, time: string) =>
      DateTime.fromISO(`${date}T${time}`, { zone: 'UTC' })
    const plain = [
      {
        date: on('2024-07-01', '00:00'),
        market_open: on('2024-07-01', '09:30'),
        market_close: on('2024-07-01', '16:00'),
      },
      {
        date: on('2024-07-02', '00:00'),
        market_open: on('2024-07-02', '09:30'),
        market_close: on('2024-07-02', '16:00'),
      },
    ]

    assert.deepEqual(
      stamps(dateRange(plain, '4h', { session: 'closed', closed: 'left' })),
      [
        'Mon 16:00',
        'Mon 20:00',
        'Tue 00:00',
        'Tue 04:00',
        'Tue 08:00',
        'Tue 16:00',
        'Tue 20:00',
      ],
    )
  })

  test('closes the gap between sessions when merged with them', ({
    assert,
  }) => {
    const sched = nyse().schedule('2024-07-01', '2024-07-02')
    const all = dateRange(sched, '1h', {
      session: ['ETH', 'RTH', 'closed'],
      closed: 'left',
    })

    // Every hour from the first pre-market bar to the last closed-session one.
    assert.lengthOf(all, 44)
    assert.equal(all[0].toFormat('ccc HH:mm'), 'Mon 04:00')
    assert.equal(all[all.length - 1].toFormat('ccc HH:mm'), 'Tue 23:00')

    const gaps = new Set(
      all.slice(1).map((t, i) => t.diff(all[i], 'hours').hours),
    )
    assert.deepEqual([...gaps], [1])
  })
})

test.group('day offsets', () => {
  const cal = new OvernightMarket()
  const ct = (at: string) => DateTime.fromISO(at, { zone: 'America/Chicago' })

  test('places the open on the previous calendar day', ({ assert }) => {
    const [tue, wed] = cal.schedule('2024-07-02', '2024-07-03')
    assert.equal(tue.market_open.toFormat('ccc dd HH:mm'), 'Mon 01 17:00')
    assert.equal(tue.market_close.toFormat('ccc dd HH:mm'), 'Tue 02 16:00')
    assert.equal(wed.market_open.toFormat('ccc dd HH:mm'), 'Tue 02 17:00')
  })

  test('reports the offsets', ({ assert }) => {
    assert.equal(cal.openOffset, -1)
    assert.equal(cal.closeOffset, 0)
    assert.equal(nyse().openOffset, 0)
  })

  test('is open across the evening boundary', ({ assert }) => {
    assert.isFalse(cal.openAtTime(ct('2024-07-01T16:30'))) // after Monday's close
    assert.isTrue(cal.openAtTime(ct('2024-07-01T17:00'))) //  Tuesday's session opens
    assert.isTrue(cal.openAtTime(ct('2024-07-02T03:00'))) //  overnight
    assert.isTrue(cal.openAtTime(ct('2024-07-02T15:59')))
    assert.isFalse(cal.openAtTime(ct('2024-07-02T16:30')))
  })

  test('opens on a Sunday evening for the Monday trade date', ({ assert }) => {
    // The weekmask governs the trade date, not the day the session opens on,
    // so Sunday carries Monday's open even though Sunday is not a session.
    assert.isFalse(cal.openAtTime(ct('2024-07-06T12:00'))) // Saturday
    assert.isFalse(cal.openAtTime(ct('2024-07-07T12:00'))) // Sunday, still shut
    assert.isTrue(cal.openAtTime(ct('2024-07-07T17:30'))) //  Monday's session
    assert.deepEqual(
      cal.validDays('2024-07-06', '2024-07-08').map((d) => d.toISODate()),
      ['2024-07-08'],
    )
  })
})

test.group('discontinued market times', () => {
  const cal = new RetiredBreakMarket()
  const columns = (date: string) =>
    Object.keys(cal.schedule(date, date)[0]).sort()

  test('publishes the column until it is dropped', ({ assert }) => {
    assert.deepEqual(columns('2019-06-03'), [
      'break_end',
      'break_start',
      'date',
      'market_close',
      'market_open',
    ])
    assert.deepEqual(columns('2021-06-03'), [
      'date',
      'market_close',
      'market_open',
    ])
  })

  test('reports which times are discontinued', ({ assert }) => {
    assert.isTrue(cal.isDiscontinued('break_start'))
    assert.isTrue(cal.isDiscontinued('break_end'))
    assert.isFalse(cal.isDiscontinued('market_open'))
    assert.isTrue(cal.hasDiscontinued)
    assert.isFalse(nyse().hasDiscontinued)
  })

  test('has no current time for a discontinued column', ({ assert }) => {
    assert.isUndefined(cal.getTime('break_start'))
    assert.deepEqual(cal.getTimeOn('break_start', '2019-06-03'), [12, 0])
  })

  test('stops treating the retired break as closed', ({ assert }) => {
    const at = (date: string, time: string) =>
      DateTime.fromISO(`${date}T${time}`, { zone: 'UTC' })
    assert.isFalse(cal.openAtTime(at('2019-06-03', '12:30')))
    assert.isTrue(cal.openAtTime(at('2021-06-03', '12:30')))
  })
})

test.group('schedule options', () => {
  const cal = nyse()
  const times = (schedule: ReturnType<typeof cal.schedule>) => {
    const [day] = schedule
    return Object.keys(day)
      .filter((key) => key !== 'date')
      .sort()
      .map((key) => `${key}=${day[key].toFormat('HH:mm')}`)
      .join(' ')
  }

  test('returns the exchange timezone by default', ({ assert }) => {
    assert.equal(
      times(cal.schedule('2024-07-02', '2024-07-02')),
      'market_close=16:00 market_open=09:30 post=20:00 pre=04:00',
    )
  })

  test('converts the market times to a requested zone', ({ assert }) => {
    assert.equal(
      times(cal.schedule('2024-07-02', '2024-07-02', { tz: 'UTC' })),
      'market_close=20:00 market_open=13:30 post=00:00 pre=08:00',
    )
  })

  test('keeps the session date as the session date', ({ assert }) => {
    // Converting the date too would move a session onto the wrong day.
    const [day] = cal.schedule('2024-07-02', '2024-07-02', { tz: 'UTC' })
    assert.equal(day.date.toISODate(), '2024-07-02')
  })

  test('publishes only the requested columns', ({ assert }) => {
    const [day] = cal.schedule('2024-07-02', '2024-07-02', {
      marketTimes: ['market_open', 'market_close'],
    })
    assert.deepEqual(Object.keys(day).sort(), [
      'date',
      'market_close',
      'market_open',
    ])
  })

  test('insists on the open and the close', ({ assert }) => {
    assert.throws(
      () =>
        cal.schedule('2024-07-02', '2024-07-02', {
          marketTimes: ['pre', 'market_close'],
        }),
      /must include market_open/,
    )
  })

  test('builds a schedule from days already worked out', ({ assert }) => {
    const days = cal.validDays('2024-07-01', '2024-07-03')
    const fromDays = cal.scheduleFromDays(days)
    assert.deepEqual(
      fromDays.map((d) => d.date.toISODate()),
      ['2024-07-01', '2024-07-02', '2024-07-03'],
    )
    assert.deepEqual(fromDays, cal.schedule('2024-07-01', '2024-07-03'))
  })
})

test.group('special time clamping', () => {
  const cal = nyse()
  const columns = (date: string, options = {}) => {
    const [day] = cal.schedule(date, date, options)
    return `open=${day.market_open.toFormat('HH:mm')} close=${day.market_close.toFormat('HH:mm')} post=${day.post.toFormat('HH:mm')}`
  }

  test('pulls a column inside an early close', ({ assert }) => {
    // 1992 has no special post, so the regular 20:00 conforms to the close.
    assert.equal(columns('1992-12-24'), 'open=09:30 close=14:00 post=14:00')
  })

  test('leaves a column that has a special of its own', ({ assert }) => {
    // A 13:00 close comes with its own 17:00 post, which is authoritative.
    assert.equal(columns('2024-07-03'), 'open=09:30 close=13:00 post=17:00')
  })

  test('false applies the special without conforming others', ({ assert }) => {
    assert.equal(
      columns('1992-12-24', { forceSpecialTimes: false }),
      'open=09:30 close=14:00 post=20:00',
    )
  })

  test('null ignores special times entirely', ({ assert }) => {
    assert.equal(
      columns('1992-12-24', { forceSpecialTimes: null }),
      'open=09:30 close=16:00 post=20:00',
    )
    assert.equal(
      columns('2024-07-03', { forceSpecialTimes: null }),
      'open=09:30 close=16:00 post=20:00',
    )
  })

  test('leaves a regular day untouched', ({ assert }) => {
    assert.equal(columns('2024-07-02'), 'open=09:30 close=16:00 post=20:00')
  })
})

test.group('interruptions', () => {
  const cal = new HaltingMarket()
  const utc = (at: string) => DateTime.fromISO(at, { zone: 'UTC' })
  const halts = (date: string) => {
    const [day] = cal.schedule(date, date, { interruptions: true })
    return Object.keys(day)
      .filter((key) => key.startsWith('interruption'))
      .sort()
      .map((key) => `${key}=${day[key].toFormat('dd HH:mm')}`)
      .join(' ')
  }

  test('leaves them out of a schedule by default', ({ assert }) => {
    assert.deepEqual(
      Object.keys(cal.schedule('2024-07-02', '2024-07-02')[0]).sort(),
      ['date', 'market_close', 'market_open'],
    )
  })

  test('numbers each halt of the day from one', ({ assert }) => {
    assert.equal(
      halts('2024-07-02'),
      'interruption_end_1=02 10:00 interruption_end_2=02 10:30 ' +
        'interruption_start_1=02 09:59 interruption_start_2=02 10:29',
    )
  })

  test('carries a halt across midnight with a day offset', ({ assert }) => {
    assert.equal(
      halts('2024-07-03'),
      'interruption_end_1=04 11:02 interruption_start_1=03 11:00',
    )
  })

  test('gives a day without a halt no columns', ({ assert }) => {
    assert.equal(halts('2024-07-01'), '')
  })

  test('closes the market for the duration', ({ assert }) => {
    assert.isTrue(cal.openAtTime(utc('2024-07-02T09:58')))
    assert.isFalse(cal.openAtTime(utc('2024-07-02T09:59'))) // halt begins
    assert.isTrue(cal.openAtTime(utc('2024-07-02T10:00'))) //  and ends
    assert.isTrue(cal.openAtTime(utc('2024-07-02T10:15')))
    assert.isFalse(cal.openAtTime(utc('2024-07-02T10:29'))) // the second halt
    assert.isTrue(cal.openAtTime(utc('2024-07-02T10:30')))
  })

  test('counts the halt instant when includeClose is set', ({ assert }) => {
    assert.isTrue(
      cal.openAtTime(utc('2024-07-02T09:59'), { includeClose: true }),
    )
  })

  test('leaves an unhalted day alone', ({ assert }) => {
    assert.isTrue(cal.openAtTime(utc('2024-07-01T10:15')))
    assert.isTrue(cal.openAtTime(utc('2024-07-01T09:59')))
  })

  test('a calendar without halts is unchanged', ({ assert }) => {
    assert.deepEqual(nyse().interruptions, [])
    assert.deepEqual(
      nyse().schedule('2024-07-02', '2024-07-02', { interruptions: true }),
      nyse().schedule('2024-07-02', '2024-07-02'),
    )
  })
})

test.group('NYSE Saturday closures', () => {
  const cal = nyse()
  const saturdaySessions = (from: string, to: string) =>
    cal
      .validDays(from, to)
      .filter((d) => d.weekday === Weekday.SATURDAY)
      .map((d) => d.toISODate())

  test('shuts on summer Saturdays from 1945', ({ assert }) => {
    // The 1950 shutdown ran 3 June to 30 September.
    assert.deepEqual(saturdaySessions('1950-06-01', '1950-10-02'), [])
    assert.deepEqual(saturdaySessions('1950-01-01', '1950-01-31'), [
      '1950-01-07',
      '1950-01-14',
      '1950-01-21',
      '1950-01-28',
    ])
  })

  test('still trades the Saturdays outside the shutdown', ({ assert }) => {
    assert.include(saturdaySessions('1950-05-01', '1950-05-31'), '1950-05-27')
    assert.include(saturdaySessions('1950-10-01', '1950-10-31'), '1950-10-07')
  })

  test('closes the last Saturday session in May 1952', ({ assert }) => {
    // Saturday trading ended on 1952-09-29, but every Saturday from 31 May
    // fell inside that year's summer shutdown, so May 24 was the last one.
    const final = saturdaySessions('1952-01-01', '1952-12-31')
    assert.equal(final[final.length - 1], '1952-05-24')
    assert.deepEqual(saturdaySessions('1952-05-31', '1952-05-31'), [])
  })

  test('observes the adhoc Saturday closings', ({ assert }) => {
    assert.deepEqual(saturdaySessions('1950-12-23', '1950-12-23'), []) // before Christmas
    assert.deepEqual(saturdaySessions('1930-04-19', '1930-04-19'), []) // after Good Friday
    assert.deepEqual(saturdaySessions('1916-12-30', '1916-12-30'), []) // before New Year
  })

  test('leaves the modern era alone', ({ assert }) => {
    assert.deepEqual(saturdaySessions('2024-01-01', '2024-12-31'), [])
    assert.equal(cal.validDays('2024-07-01', '2024-07-31').length, 22)
  })
})

test.group('saturdays helper', () => {
  test('runs weekly and includes both ends', ({ assert }) => {
    assert.deepEqual(
      saturdays('1945-07-07', '1945-09-01').map((d) => d.toISODate()),
      [
        '1945-07-07',
        '1945-07-14',
        '1945-07-21',
        '1945-07-28',
        '1945-08-04',
        '1945-08-11',
        '1945-08-18',
        '1945-08-25',
        '1945-09-01',
      ],
    )
  })

  test('refuses a start that is not a Saturday', ({ assert }) => {
    // Starting a day out would shift every date in the run.
    assert.throws(() => saturdays('1945-07-08', '1945-09-01'), /not a Saturday/)
  })
})

test.group('NYSE special closes and opens', () => {
  const cal = nyse()
  const session = (date: string) => {
    const [day] = cal.schedule(date, date)
    return day
      ? `${day.market_open.toFormat('HH:mm')}-${day.market_close.toFormat('HH:mm')}`
      : 'closed'
  }

  test('closes early for one-off events', ({ assert }) => {
    assert.equal(session('1910-05-07'), '10:00-11:00') // King Edward VII died
    assert.equal(session('1920-09-16'), '10:00-12:00') // Wall Street bombing
    assert.equal(session('1963-11-22'), '10:00-14:07') // Kennedy assassination
    assert.equal(session('1981-03-30'), '10:00-15:17') // Reagan shot
    assert.equal(session('1997-10-27'), '09:30-15:30') // circuit breaker
    assert.equal(session('2005-06-01'), '09:30-15:56') // system failure
  })

  test('opens late for one-off events', ({ assert }) => {
    assert.equal(session('2001-09-17'), '09:33-16:00') // first day back after 9/11
    assert.equal(session('1996-01-08'), '11:00-14:00') // Blizzard of 1996
  })

  test('closes at 13:00 on Christmas Eve only from 1999', ({ assert }) => {
    // The recurring rule starts in 1999; 1996-1998 are listed date by date.
    assert.equal(session('2024-12-24'), '09:30-13:00')
    assert.equal(session('1996-12-24'), '09:30-13:00')
    // 1994 and 1995 had no early close: the rule did not hold yet and
    // neither year is in the list.
    assert.equal(session('1994-12-23'), '09:30-16:00')
    assert.equal(session('1995-12-22'), '09:30-16:00')
  })

  test('closes at 14:00 on the listed Christmas Eves', ({ assert }) => {
    assert.equal(session('1974-12-24'), '10:00-14:00')
    assert.equal(session('1992-12-24'), '09:30-14:00')
  })

  test('conforms the post session to any early close', ({ assert }) => {
    const [kennedy] = cal.schedule('1963-11-22', '1963-11-22')
    assert.equal(kennedy.post.toFormat('HH:mm'), '14:07')
    // A 13:00 half-day keeps its declared 17:00 post instead.
    const [halfDay] = cal.schedule('2024-07-03', '2024-07-03')
    assert.equal(halfDay.post.toFormat('HH:mm'), '17:00')
  })

  test('reports the early closes and late opens of a year', ({ assert }) => {
    const year = cal.schedule('2024-01-01', '2024-12-31')
    assert.deepEqual(
      cal.earlyCloses(year).map((d) => d.date.toISODate()),
      ['2024-07-03', '2024-11-29', '2024-12-24'],
    )
    assert.deepEqual(cal.lateOpens(year), [])
  })

  test('finds late opens now that they are modelled', ({ assert }) => {
    // lateOpens returned nothing at all before these were ported.
    const era = cal.schedule('1960-01-01', '2024-12-31')
    assert.isAbove(cal.lateOpens(era).length, 0)
    assert.include(
      cal.lateOpens(era).map((d) => d.date.toISODate()),
      '2001-09-17',
    )
  })
})

test.group('CME calendars', () => {
  const equity = new CMEEquity()
  const bond = new CMEBond()
  const ct = (at: string) => DateTime.fromISO(at, { zone: 'America/Chicago' })
  const row = (cal: CMEEquity | CMEBond, date: string) => {
    const [day] = cal.schedule(date, date)
    if (!day) return 'closed'
    const brk = day.break_start
      ? ` break=${day.break_start.toFormat('HH:mm')}-${day.break_end.toFormat('HH:mm')}`
      : ''
    return `${day.market_open.toFormat('ccc dd HH:mm')} to ${day.market_close.toFormat('HH:mm')}${brk}`
  }

  test('resolves by every alias', ({ assert }) => {
    assert.equal(getCalendar('CME_Equity').name, 'CME_Equity')
    assert.equal(getCalendar('cbot_bond').name, 'CME_Bond')
    assert.equal(getCalendar('CME_InterestRate').name, 'CME_Bond')
  })

  test('opens the equity session the evening before', ({ assert }) => {
    // Monday's trade date opens on the Sunday.
    assert.equal(
      row(equity, '2024-06-03'),
      'Sun 02 17:00 to 16:00 break=15:15-15:30',
    )
    assert.equal(equity.openOffset, -1)
  })

  test('follows the equity session through its three eras', ({ assert }) => {
    assert.equal(
      row(equity, '2004-06-02'),
      'Tue 01 17:00 to 16:00 break=15:15-15:30',
    )
    // Between 2005 and 2012 the session was shorter and had no real break,
    // which upstream models as a zero-length one at the close.
    assert.equal(
      row(equity, '2008-06-02'),
      'Sun 01 15:30 to 15:15 break=15:15-15:15',
    )
    assert.equal(
      row(equity, '2024-06-03'),
      'Sun 02 17:00 to 16:00 break=15:15-15:30',
    )
  })

  test('closes or shortens Good Friday year by year', ({ assert }) => {
    assert.equal(row(equity, '2019-04-19'), 'closed')
    assert.equal(row(equity, '2022-04-15'), 'closed')
    assert.equal(
      row(equity, '2021-04-02'),
      'Thu 01 17:00 to 08:15 break=08:15-08:15',
    )
    assert.equal(
      row(equity, '2024-03-29'),
      'Thu 28 17:00 to 08:15 break=08:15-08:15',
    )
  })

  test('closes at noon on the shared half-days', ({ assert }) => {
    for (const date of ['2024-05-27', '2024-07-03', '2024-11-29']) {
      assert.match(row(equity, date), /to 12:00/)
    }
  })

  test('runs the bond session overnight', ({ assert }) => {
    assert.equal(row(bond, '2024-06-03'), 'Sun 02 17:00 to 16:00')
    assert.isTrue(bond.openAtTime(ct('2024-06-02T18:00'))) // Sunday evening
    assert.isTrue(bond.openAtTime(ct('2024-06-03T02:00'))) // overnight
    assert.isTrue(bond.openAtTime(ct('2024-06-03T15:00')))
    assert.isFalse(bond.openAtTime(ct('2024-06-03T16:30'))) // after the close
  })

  test('lists the bond Good Fridays individually', ({ assert }) => {
    assert.equal(row(bond, '2024-03-29'), 'closed') //          a closed one
    assert.equal(row(bond, '2021-04-02'), 'Thu 01 17:00 to 10:00') // a short one
  })
})

test.group('CBOE and IEX calendars', () => {
  const hours = (name: string, date: string) => {
    const [day] = getCalendar(name).schedule(date, date)
    return day
      ? `${day.market_open.toFormat('HH:mm')}-${day.market_close.toFormat('HH:mm')}`
      : 'closed'
  }

  test('resolves each CBOE market by alias', ({ assert }) => {
    assert.equal(getCalendar('CBOE_Futures').name, 'CFE')
    assert.equal(getCalendar('cfe').name, 'CFE')
    assert.equal(getCalendar('CBOE_Equity_Options').name, 'CBOE_Equity_Options')
    assert.equal(getCalendar('Investors_Exchange').name, 'IEX')
  })

  test('keeps the CBOE markets on their own hours', ({ assert }) => {
    assert.equal(hours('CFE', '2024-06-03'), '08:30-15:15')
    assert.equal(hours('CBOE_Equity_Options', '2024-06-03'), '08:30-15:00')
    assert.equal(hours('CBOE_Index_Options', '2024-06-03'), '08:30-15:15')
  })

  test('closes the CBOE markets early at their own times', ({ assert }) => {
    // Black Friday: the futures close at 12:15, the options at 12:00.
    assert.equal(hours('CFE', '2024-11-29'), '08:30-12:15')
    assert.equal(hours('CBOE_Equity_Options', '2024-11-29'), '08:30-12:00')
    assert.equal(hours('CBOE_Index_Options', '2024-11-29'), '08:30-12:00')
  })

  test('shares the US holidays', ({ assert }) => {
    for (const name of ['CFE', 'CBOE_Equity_Options', 'IEX']) {
      assert.equal(hours(name, '2024-07-04'), 'closed')
      assert.equal(hours(name, '2024-03-29'), 'closed') // Good Friday
    }
  })

  test('gives IEX its shorter extended hours', ({ assert }) => {
    const [day] = getCalendar('IEX').schedule('2024-06-03', '2024-06-03')
    assert.equal(day.pre.toFormat('HH:mm'), '08:00') // NYSE opens pre at 04:00
    assert.equal(day.post.toFormat('HH:mm'), '17:00') // and closes post at 20:00
  })

  test('has no IEX session before the exchange opened', ({ assert }) => {
    const iex = getCalendar('IEX')
    assert.lengthOf(iex.validDays('2010-01-01', '2010-12-31'), 0)
    // It opened on 2013-08-25, leaving 89 sessions that year.
    assert.lengthOf(iex.validDays('2013-01-01', '2013-12-31'), 89)
    assert.deepEqual(
      iex.validDays('2013-08-20', '2013-08-27').map((d) => d.toISODate()),
      ['2013-08-26', '2013-08-27'],
    )
  })
})

test.group('JPX calendar', () => {
  const jpx = new JPX()
  const jst = (at: string) => DateTime.fromISO(at, { zone: 'Asia/Tokyo' })
  const hours = (date: string) => {
    const [day] = jpx.schedule(date, date)
    return day
      ? `${day.market_open.toFormat('HH:mm')}-${day.market_close.toFormat('HH:mm')} break ${day.break_start.toFormat('HH:mm')}-${day.break_end.toFormat('HH:mm')}`
      : 'closed'
  }

  test('breaks for lunch', ({ assert }) => {
    assert.equal(hours('2024-11-06'), '09:00-15:30 break 11:30-12:30')
  })

  test('moved its close on 2024-11-05', ({ assert }) => {
    assert.equal(hours('2024-11-01'), '09:00-15:00 break 11:30-12:30')
    assert.equal(hours('2024-11-05'), '09:00-15:30 break 11:30-12:30')
  })

  test('is shut for lunch', ({ assert }) => {
    assert.isTrue(jpx.openAtTime(jst('2024-11-06T10:00')))
    assert.isFalse(jpx.openAtTime(jst('2024-11-06T11:30'))) // the break begins
    assert.isFalse(jpx.openAtTime(jst('2024-11-06T12:00')))
    assert.isTrue(jpx.openAtTime(jst('2024-11-06T12:30'))) //  and ends
    assert.isTrue(jpx.openAtTime(jst('2024-11-06T15:20')))
  })

  test('observes the 2024 Japanese holidays', ({ assert }) => {
    assert.deepEqual(
      jpx.holidays('2024-01-01', '2024-12-31').map((d) => d.toISODate()),
      [
        '2024-01-01',
        '2024-01-02',
        '2024-01-03', // New Year
        '2024-01-08', //                             Coming of Age, 2nd Monday
        '2024-02-12', //                             National Foundation, observed
        '2024-02-23', //                             the Emperor's Birthday
        '2024-03-20', //                             vernal equinox
        '2024-04-29',
        '2024-05-03',
        '2024-05-04',
        '2024-05-06', // Golden Week
        '2024-07-15', //                             Marine Day
        '2024-08-12', //                             Mountain Day, observed
        '2024-09-16', //                             Respect for the Aged
        '2024-09-23', //                             autumnal equinox, observed
        '2024-10-14', //                             Sports Day
        '2024-11-04', //                             Culture Day, observed
        '2024-11-23', //                             Labor Thanksgiving
        '2024-12-31', //                             year end
      ],
    )
  })

  test('follows the equinoxes, which are measured not derived', ({
    assert,
  }) => {
    assert.equal(hours('2024-03-20'), 'closed')
    assert.equal(hours('2023-03-21'), 'closed') // a day later that year
    assert.equal(hours('2024-09-23'), 'closed')
  })

  test('follows the 2021 Olympic shuffle', ({ assert }) => {
    // Marine, Mountain and Sports Day all moved for the Tokyo games.
    assert.equal(hours('2021-07-22'), 'closed') // Marine Day
    assert.equal(hours('2021-07-23'), 'closed') // Sports Day
    assert.equal(hours('2021-08-09'), 'closed') // Mountain Day, observed
    // Sports Day was away from its usual October slot that year.
    assert.notEqual(hours('2021-10-11'), 'closed')
  })
})

test.group('markSession boundaries', () => {
  const cal = nyse()
  const schedule = () => cal.schedule('2024-07-02', '2024-07-02')
  const label = (time: string, closed: 'left' | 'right') => {
    const at = et(`2024-07-02T${time}`)
    return markSession(schedule(), [at], {}, closed)[at.toISO()!]
  }

  test('right gives a boundary to the session ending on it', ({ assert }) => {
    assert.equal(label('04:00', 'right'), 'closed') // pre has not begun
    assert.equal(label('09:30', 'right'), 'pre') //    pre ends here
    assert.equal(label('16:00', 'right'), 'rth')
    assert.equal(label('20:00', 'right'), 'post')
  })

  test('left gives it to the session starting on it', ({ assert }) => {
    assert.equal(label('04:00', 'left'), 'pre') //  pre begins here
    assert.equal(label('09:30', 'left'), 'rth')
    assert.equal(label('16:00', 'left'), 'post')
    assert.equal(label('20:00', 'left'), 'closed') // post has ended
  })

  test('leaves the inside of a session alone', ({ assert }) => {
    for (const closed of ['left', 'right'] as const) {
      assert.equal(label('05:00', closed), 'pre')
      assert.equal(label('10:00', closed), 'rth')
      assert.equal(label('18:00', closed), 'post')
    }
  })
})

test.group('dateRangeHTF', () => {
  const cal = nyse()
  const year = () => cal.validDays('2024-01-01', '2024-12-31')
  const iso = (days: DateTime[]) => days.map((d) => d.toISODate())

  test('takes the last trading day of each month', ({ assert }) => {
    assert.deepEqual(iso(dateRangeHTF(year(), 'ME')), [
      '2024-01-31',
      '2024-02-29',
      '2024-03-28',
      '2024-04-30',
      '2024-05-31',
      '2024-06-28',
      '2024-07-31',
      '2024-08-30',
      '2024-09-30',
      '2024-10-31',
      '2024-11-29',
      '2024-12-31',
    ])
  })

  test('takes the first when closed is left', ({ assert }) => {
    // 1 January is a holiday and 1 June a Saturday, so neither is a session.
    const first = iso(dateRangeHTF(year(), 'M', { closed: 'left' }))
    assert.equal(first[0], '2024-01-02')
    assert.equal(first[5], '2024-06-03')
  })

  test('counts trading days, not calendar days', ({ assert }) => {
    const every50th = iso(dateRangeHTF(year(), '50D'))
    assert.deepEqual(every50th, [
      '2024-01-02',
      '2024-03-14',
      '2024-05-24',
      '2024-08-07',
      '2024-10-17',
      '2024-12-30',
    ])
  })

  test('anchors the week where asked', ({ assert }) => {
    const sunday = iso(
      dateRangeHTF(year(), 'W', { closed: 'left', periods: 3 }),
    )
    const wednesday = iso(
      dateRangeHTF(year(), 'W', {
        closed: 'left',
        periods: 3,
        weekStartsOn: 3,
      }),
    )
    assert.deepEqual(sunday, ['2024-01-02', '2024-01-08', '2024-01-16'])
    assert.deepEqual(wednesday, ['2024-01-02', '2024-01-03', '2024-01-10'])
  })

  test('anchors the year where asked', ({ assert }) => {
    const era = cal.validDays('2023-01-01', '2025-06-30')
    assert.deepEqual(iso(dateRangeHTF(era, 'Y', { closed: 'left' })), [
      '2023-01-03',
      '2024-01-02',
      '2025-01-02',
    ])
    // A July anchor gives fiscal years, so each run ends in the June.
    assert.deepEqual(iso(dateRangeHTF(era, 'Y', { yearStartsIn: 7 })), [
      '2023-06-30',
      '2024-06-28',
      '2025-06-30',
    ])
  })

  test('anchors quarters only where it moves them', ({ assert }) => {
    const era = cal.validDays('2024-01-01', '2024-12-31')
    // Six months is two whole quarters, so a July anchor changes nothing.
    assert.deepEqual(
      iso(dateRangeHTF(era, 'Q', { closed: 'left', yearStartsIn: 7 })),
      iso(dateRangeHTF(era, 'Q', { closed: 'left' })),
    )
    // February does move them. January belongs to the quarter before the
    // range starts, so it appears as a partial period of its own.
    assert.deepEqual(
      iso(dateRangeHTF(era, 'Q', { closed: 'left', yearStartsIn: 2 })),
      ['2024-01-02', '2024-02-01', '2024-05-01', '2024-08-01', '2024-11-01'],
    )
  })

  test('limits by start, end and period count', ({ assert }) => {
    assert.deepEqual(
      iso(dateRangeHTF(year(), 'ME', { end: '2024-12-31', periods: 3 })),
      ['2024-10-31', '2024-11-29', '2024-12-31'],
    )
    assert.deepEqual(iso(dateRangeHTF(year(), 'ME', { start: '2024-11-01' })), [
      '2024-11-29',
      '2024-12-31',
    ])
  })

  test('rejects a frequency it cannot read', ({ assert }) => {
    assert.throws(() => dateRangeHTF(year(), 'fortnight'), /Invalid frequency/)
    assert.throws(() => dateRangeHTF(year(), 0), /positive whole number/)
  })

  test('convertFreq reads the same codes', ({ assert }) => {
    assert.deepEqual(iso(convertFreq(year(), 'ME')).slice(0, 3), [
      '2024-01-02',
      '2024-02-01',
      '2024-03-01',
    ])
    assert.deepEqual(iso(convertFreq(year(), 'Y')), ['2024-01-02'])
  })
})

test.group('LSE calendar', () => {
  const lse = new LSE()
  const hours = (date: string) => {
    const [day] = lse.schedule(date, date)
    return day
      ? `${day.market_open.toFormat('HH:mm')}-${day.market_close.toFormat('HH:mm')}`
      : 'closed'
  }
  const holidays = (from: string, to: string) =>
    lse.holidays(from, to).map((d) => d.toISODate())

  test('keeps London hours', ({ assert }) => {
    assert.equal(hours('2024-06-03'), '08:00-16:30')
    assert.equal(getCalendar('XLON').name, 'LSE')
  })

  test('observes the 2024 bank holidays', ({ assert }) => {
    assert.deepEqual(holidays('2024-01-01', '2024-12-31'), [
      '2024-01-01',
      '2024-03-29', // Good Friday
      '2024-04-01', // Easter Monday
      '2024-05-06', // Early May
      '2024-05-27', // Spring
      '2024-08-26', // Summer
      '2024-12-25',
      '2024-12-26',
    ])
  })

  test('closes early on Christmas Eve and New Year’s Eve', ({ assert }) => {
    assert.equal(hours('2024-12-24'), '08:00-12:30')
    assert.equal(hours('2024-12-31'), '08:00-12:30')
    assert.equal(hours('2024-12-23'), '08:00-16:30')
  })

  test('pushes a weekend Christmas into the following week', ({ assert }) => {
    // Christmas 2021 was a Saturday, so the closures moved to the 27th and 28th.
    assert.equal(hours('2021-12-27'), 'closed')
    assert.equal(hours('2021-12-28'), 'closed')
  })

  test('moves the Spring bank holiday for a royal occasion', ({ assert }) => {
    // 2002, 2012 and 2022 all moved it; the jubilee dates replace it.
    assert.deepEqual(holidays('2002-05-01', '2002-06-30'), [
      '2002-05-06',
      '2002-06-03',
      '2002-06-04',
    ])
    assert.deepEqual(holidays('2012-05-01', '2012-06-30'), [
      '2012-05-07',
      '2012-06-04',
      '2012-06-05',
    ])
    // 2022-05-30 is NOT a holiday: it moved to 2 June for the Platinum
    // Jubilee. The reference implementation reports it closed.
    assert.deepEqual(holidays('2022-05-01', '2022-06-30'), [
      '2022-05-02',
      '2022-06-02',
      '2022-06-03',
    ])
  })

  test('resumes the Spring bank holiday afterwards', ({ assert }) => {
    assert.deepEqual(holidays('2023-05-01', '2023-06-30'), [
      '2023-05-01', //  Early May
      '2023-05-08', //  coronation of Charles III
      '2023-05-29', //  Spring, back in its usual place
    ])
  })

  test('closes for the state funeral', ({ assert }) => {
    assert.equal(hours('2022-09-19'), 'closed')
  })
})

test.group('TSX calendar', () => {
  const tsx = new TSX()
  const hours = (date: string) => {
    const [day] = tsx.schedule(date, date)
    return day
      ? `${day.market_open.toFormat('HH:mm')}-${day.market_close.toFormat('HH:mm')}`
      : 'closed'
  }
  const holidays = (year: number) =>
    tsx.holidays(`${year}-01-01`, `${year}-12-31`).map((d) => d.toISODate())

  test('keeps Toronto hours', ({ assert }) => {
    assert.equal(hours('2024-06-03'), '09:30-16:00')
    assert.equal(getCalendar('TSXV').name, 'TSX')
  })

  test('observes the Canadian holidays', ({ assert }) => {
    assert.deepEqual(holidays(2024), [
      '2024-01-01',
      '2024-02-19', // Family Day
      '2024-03-29', // Good Friday
      '2024-05-20', // Victoria Day
      '2024-07-01', // Canada Day
      '2024-08-05', // Civic Holiday
      '2024-09-02', // Labour Day
      '2024-10-14', // Thanksgiving, in October rather than November
      '2024-12-25',
      '2024-12-26', // Boxing Day
    ])
    assert.deepEqual(holidays(2025), [
      '2025-01-01',
      '2025-02-17',
      '2025-04-18',
      '2025-05-19',
      '2025-07-01',
      '2025-08-04',
      '2025-09-01',
      '2025-10-13',
      '2025-12-25',
      '2025-12-26',
    ])
  })

  test('has no Family Day before 2008', ({ assert }) => {
    assert.notInclude(holidays(2007), '2007-02-19')
    assert.include(holidays(2008), '2008-02-18')
  })

  test('closes early on a weekday Christmas Eve from 2010', ({ assert }) => {
    assert.equal(hours('2024-12-24'), '09:30-13:00') // a Tuesday
    assert.equal(hours('2021-12-24'), '09:30-13:00') // a Friday
    assert.equal(hours('2009-12-24'), '09:30-16:00') // before the rule
    assert.equal(hours('2022-12-24'), 'closed') //      a Saturday
  })

  test('shut for two days after the 2001 attacks', ({ assert }) => {
    assert.equal(hours('2001-09-11'), 'closed')
    assert.equal(hours('2001-09-12'), 'closed')
    assert.equal(hours('2001-09-13'), '09:30-16:00')
  })
})

test.group('European, Australian and 24-hour calendars', () => {
  const holidays = (name: string, year: number) =>
    getCalendar(name)
      .holidays(`${year}-01-01`, `${year}-12-31`)
      .map((d) => d.toISODate())
  const session = (name: string, date: string) => {
    const [day] = getCalendar(name).schedule(date, date)
    return day
      ? `${day.market_open.toFormat('ccc dd HH:mm')}-${day.market_close.toFormat('HH:mm')}`
      : 'closed'
  }

  test('ASX observes the Australian holidays', ({ assert }) => {
    assert.deepEqual(holidays('ASX', 2024), [
      '2024-01-01',
      '2024-01-26', // Australia Day
      '2024-03-29',
      '2024-04-01', // Easter
      '2024-04-25', // ANZAC Day
      '2024-06-10', // the Queen's Birthday
      '2024-12-25',
      '2024-12-26',
    ])
    assert.equal(session('ASX', '2024-06-03'), 'Mon 03 10:00-16:10')
  })

  test('ASX pushes a weekend Christmas onto the next free days', ({
    assert,
  }) => {
    // Christmas 2021 was a Saturday, so Boxing Day goes to the Tuesday.
    assert.deepEqual(
      getCalendar('ASX')
        .holidays('2021-12-20', '2021-12-31')
        .map((d) => d.toISODate()),
      ['2021-12-27', '2021-12-28'],
    )
  })

  test('ASX closes early on the eves', ({ assert }) => {
    assert.equal(session('ASX', '2024-12-24'), 'Tue 24 10:00-14:10')
    assert.equal(session('ASX', '2024-12-31'), 'Tue 31 10:00-14:10')
  })

  test('SIX observes the Swiss holidays', ({ assert }) => {
    assert.deepEqual(holidays('SIX', 2024), [
      '2024-01-01',
      '2024-01-02', // Berthold's Day
      '2024-03-29',
      '2024-04-01',
      '2024-05-01',
      '2024-05-09', // Ascension, 39 days after Easter
      '2024-05-20', // Whit Monday, 50 days after
      '2024-08-01', // Swiss National Day
      '2024-12-24',
      '2024-12-25',
      '2024-12-26',
      '2024-12-31',
    ])
  })

  test('EUREX closes early where its bond market closes outright', ({
    assert,
  }) => {
    assert.deepEqual(holidays('EUREX', 2024), [
      '2024-01-01',
      '2024-03-29',
      '2024-04-01',
      '2024-05-01',
      '2024-12-25',
      '2024-12-26',
    ])
    assert.equal(session('EUREX', '2024-12-24'), 'Tue 24 08:00-12:30')
    // The fixed income calendar shuts on those days instead.
    assert.include(holidays('EUREX_Bond', 2024), '2024-12-24')
    assert.include(holidays('EUREX_Bond', 2024), '2024-12-31')
  })

  test('EUREX_PrePost carries the extended sessions', ({ assert }) => {
    const [day] = getCalendar('EUREX_Extended').schedule(
      '2024-06-03',
      '2024-06-03',
    )
    assert.equal(day.pre.toFormat('HH:mm'), '00:15')
    assert.equal(day.market_close.toFormat('HH:mm'), '16:30')
    assert.equal(day.post.toFormat('HH:mm'), '21:00')
  })

  test('OSE keeps the long Norwegian Easter', ({ assert }) => {
    assert.deepEqual(holidays('OSE', 2024), [
      '2024-01-01',
      '2024-03-28', // Maundy Thursday
      '2024-03-29',
      '2024-04-01',
      '2024-05-01',
      '2024-05-09', // Ascension
      '2024-05-17', // Constitution Day
      '2024-05-20', // Whit Monday
      '2024-12-24',
      '2024-12-25',
      '2024-12-26',
      '2024-12-31',
    ])
    // The Wednesday before Easter is a half day.
    assert.equal(session('OSE', '2024-03-27'), 'Wed 27 09:00-13:00')
  })

  test('ICE opens the evening before its trade date', ({ assert }) => {
    assert.equal(session('ICE', '2024-06-03'), 'Sun 02 20:01-18:00')
    assert.deepEqual(holidays('ICE', 2024), [
      '2024-01-01',
      '2024-03-29',
      '2024-12-25',
    ])
    // It shut for the first day of Hurricane Sandy only.
    assert.equal(session('ICE', '2012-10-29'), 'closed')
    assert.notEqual(session('ICE', '2012-10-30'), 'closed')
  })

  test('FOREX trades from Sunday evening with no holidays', ({ assert }) => {
    assert.deepEqual(holidays('FOREX', 2024), [])
    assert.deepEqual(
      getCalendar('FX')
        .validDays('2024-06-02', '2024-06-08')
        .map((d) => d.toISODate()),
      [
        '2024-06-02', // Sunday is a session
        '2024-06-03',
        '2024-06-04',
        '2024-06-05',
        '2024-06-06',
        '2024-06-07',
      ],
    )
  })
})

test.group('CME Globex products', () => {
  const day = (name: string, date: string) => {
    const [row] = getCalendar(name).schedule(date, date)
    if (!row) return 'closed'
    const brk = row.break_start
      ? ` break ${row.break_start.toFormat('HH:mm')}-${row.break_end.toFormat('HH:mm')}`
      : ''
    return `${row.market_open.toFormat('ccc dd HH:mm')}-${row.market_close.toFormat('HH:mm')}${brk}`
  }

  test('opens the evening before on the overnight products', ({ assert }) => {
    for (const name of [
      'CME Globex Equity',
      'CME Globex Fixed Income',
      'CMEGlobex_FX',
      'CMEGlobex_Energy',
      'CME Globex Crypto',
    ]) {
      assert.equal(day(name, '2024-06-03'), 'Sun 02 17:00-16:00')
    }
  })

  test('closes each product at its own time on a half-day', ({ assert }) => {
    // Memorial Day 2024: every product treats it differently.
    assert.equal(day('CME Globex Equity', '2024-05-27'), 'Sun 26 17:00-12:00')
    assert.equal(day('CMEGlobex_Energy', '2024-05-27'), 'Sun 26 17:00-13:30')
    assert.equal(day('CMEGlobex_Livestock', '2024-05-27'), 'closed')
  })

  test('differs on Good Friday by product', ({ assert }) => {
    assert.equal(day('CME Globex Equity', '2024-03-29'), 'Thu 28 17:00-08:15')
    assert.equal(
      day('CME Globex Fixed Income', '2024-03-29'),
      'Thu 28 17:00-10:15',
    )
    // Energy and the agricultural products shut outright.
    assert.equal(day('CMEGlobex_Energy', '2024-03-29'), 'closed')
    assert.equal(day('CMEGlobex_Grains', '2024-03-29'), 'closed')
  })

  test('closes early on the Friday after Thanksgiving', ({ assert }) => {
    assert.equal(day('CME Globex Equity', '2024-11-29'), 'Thu 28 17:00-12:15')
    assert.equal(day('CMEGlobex_Energy', '2024-11-29'), 'Thu 28 17:00-12:45')
    assert.equal(day('CMEGlobex_Livestock', '2024-11-29'), 'Fri 29 08:30-12:05')
  })

  test('gives the agricultural products their own hours', ({ assert }) => {
    // Livestock trades a daytime session; grains run overnight with a break.
    assert.equal(day('CMEGlobex_Livestock', '2024-06-03'), 'Mon 03 08:30-13:05')
    assert.equal(
      day('CMEGlobex_Grains', '2024-06-03'),
      'Sun 02 19:00-13:20 break 07:45-08:30',
    )
  })

  test('shuts every product for Christmas and New Year', ({ assert }) => {
    for (const name of [
      'CME Globex Equity',
      'CMEGlobex_FX',
      'CMEGlobex_Energy',
      'CME Globex Crypto',
      'CMEGlobex_Grains',
    ]) {
      assert.equal(day(name, '2024-12-25'), 'closed')
      assert.equal(day(name, '2024-01-01'), 'closed')
    }
  })

  test('resolves the product aliases', ({ assert }) => {
    assert.equal(getCalendar('CME_Currency').name, 'CME Globex FX')
    assert.equal(
      getCalendar('CMEGlobex_Gold').name,
      'CME Globex Energy and Metals',
    )
    assert.equal(getCalendar('cmeglobex_oilseeds').name, 'CME Globex Grains')
  })
})

test.group('SIFMA calendars', () => {
  const holidays = (name: string, year: number) =>
    getCalendar(name)
      .holidays(`${year}-01-01`, `${year}-12-31`)
      .map((d) => d.toISODate())

  test('keeps each desk on its own hours', ({ assert }) => {
    const hours = (name: string) => {
      const [day] = getCalendar(name).schedule('2024-06-03', '2024-06-03')
      return `${day.market_open.toFormat('HH:mm')}-${day.market_close.toFormat('HH:mm')}`
    }
    assert.equal(hours('SIFMA_US'), '07:00-17:30')
    assert.equal(hours('SIFMA_UK'), '08:00-17:00')
    assert.equal(hours('SIFMA_JP'), '08:30-18:30')
  })

  test('the US desk keeps Columbus and Veterans Day', ({ assert }) => {
    assert.deepEqual(holidays('SIFMA_US', 2024), [
      '2024-01-01',
      '2024-01-15', // Martin Luther King Day
      '2024-02-19',
      '2024-05-27',
      '2024-06-19',
      '2024-07-04',
      '2024-09-02',
      '2024-10-14', // Columbus Day, which the equity calendars trade through
      '2024-11-11', // Veterans Day, likewise
      '2024-11-28',
      '2024-12-25',
    ])
  })

  test('the US desk closes at 14:00 around a holiday', ({ assert }) => {
    const cal = getCalendar('SIFMA_US')
    const year = cal.schedule('2024-01-01', '2024-12-31')
    assert.deepEqual(
      cal.earlyCloses(year).map((d) => d.date.toISODate()),
      [
        '2024-05-24', // the Friday before Memorial Day
        '2024-07-03',
        '2024-11-29', // the day after Thanksgiving
        '2024-12-24',
        '2024-12-31',
      ],
    )
    assert.equal(
      cal.earlyCloses(year)[0].market_close.toFormat('HH:mm'),
      '14:00',
    )
  })

  test('the US desk stops closing for Good Friday after 2020', ({ assert }) => {
    // SIFMA decides year by year from 2021, so no rule covers it.
    assert.include(holidays('SIFMA_US', 2020), '2020-04-10')
    assert.notInclude(holidays('SIFMA_US', 2024), '2024-03-29')
    // The other two desks keep it as a UK bank holiday.
    assert.include(holidays('SIFMA_UK', 2024), '2024-03-29')
    assert.include(holidays('SIFMA_JP', 2024), '2024-03-29')
  })

  test('the UK desk keeps both countries’ holidays', ({ assert }) => {
    const uk = holidays('SIFMA_UK', 2024)
    assert.include(uk, '2024-05-06') // UK early May bank holiday
    assert.include(uk, '2024-08-26') // UK summer bank holiday
    assert.include(uk, '2024-12-26') // Boxing Day
    assert.include(uk, '2024-01-15') // and US Martin Luther King Day
    assert.include(uk, '2024-11-28') // and US Thanksgiving
  })

  test('the JP desk keeps all three', ({ assert }) => {
    const jp = holidays('SIFMA_JP', 2024)
    assert.include(jp, '2024-03-20') // Japanese vernal equinox
    assert.include(jp, '2024-05-03') // Constitution Memorial Day
    assert.include(jp, '2024-11-23') // Labour Thanksgiving
    assert.include(jp, '2024-04-01') // UK Easter Monday
    assert.include(jp, '2024-07-04') // US Independence Day
    assert.isAbove(jp.length, holidays('SIFMA_UK', 2024).length)
  })

  test('resolves the descriptive aliases', ({ assert }) => {
    assert.equal(getCalendar('Bond_Markets_US').name, 'SIFMA_US')
    assert.equal(getCalendar('capital_markets_jp').name, 'SIFMA_JP')
  })
})

test.group('BMF and TASE calendars', () => {
  const holidays = (name: string, year: number) =>
    getCalendar(name)
      .holidays(`${year}-01-01`, `${year}-12-31`)
      .map((d) => d.toISODate())

  test('BMF keeps the Brazilian holidays', ({ assert }) => {
    assert.deepEqual(holidays('B3', 2024), [
      '2024-01-01',
      '2024-02-12',
      '2024-02-13', // Carnival Monday and Tuesday
      '2024-03-29', //               Sexta-feira da Paixão
      '2024-04-21', //               Tiradentes
      '2024-05-01',
      '2024-05-30', //               Corpus Christi, 60 days after Easter
      '2024-09-07', //               Independência
      '2024-10-12', //               Nossa Senhora Aparecida
      '2024-11-02', //               Finados
      '2024-11-15', //               Proclamação da República
      '2024-11-20', //               Consciência Negra
      '2024-12-24',
      '2024-12-25',
      '2024-12-31',
    ])
  })

  test('BMF drops the holidays that have lapsed', ({ assert }) => {
    const y2019 = holidays('B3', 2019)
    // The São Paulo city anniversary ran to 2021 and Constitucionalista
    // to 2019, so both are present then and gone by 2024.
    assert.include(y2019, '2019-01-25')
    assert.include(y2019, '2019-07-09')
    assert.notInclude(holidays('B3', 2024), '2024-01-25')
    assert.notInclude(holidays('B3', 2024), '2024-07-09')
  })

  test('BMF moves Carnival with Easter', ({ assert }) => {
    // Carnival is 48 and 47 days before Easter, so it tracks it.
    assert.include(holidays('B3', 2023), '2023-02-20')
    assert.include(holidays('B3', 2023), '2023-02-21')
  })

  test('TASE trades Sunday to Thursday', ({ assert }) => {
    assert.deepEqual(
      getCalendar('TASE')
        .validDays('2024-06-02', '2024-06-08')
        .map((d) => d.toISODate()),
      ['2024-06-02', '2024-06-03', '2024-06-04', '2024-06-05', '2024-06-06'],
    )
    const [day] = getCalendar('TASE').schedule('2024-06-03', '2024-06-03')
    assert.equal(day.market_open.toFormat('HH:mm'), '10:00')
    assert.equal(day.market_close.toFormat('HH:mm'), '15:59')
  })

  test('TASE closes for the listed lunar holidays', ({ assert }) => {
    const y2024 = holidays('TASE', 2024)
    assert.include(y2024, '2024-04-22') // Passover
    assert.include(y2024, '2024-05-14') // Independence Day
    assert.include(y2024, '2024-10-03') // Rosh Hashanah
    assert.include(y2024, '2024-10-11') // Yom Kippur
    assert.lengthOf(y2024, 19)
  })

  test('resolves the aliases', ({ assert }) => {
    assert.equal(getCalendar('BVMF').name, 'BMF')
    assert.equal(getCalendar('xtae').name, 'TASE')
  })
})

test.group('Indian exchanges', () => {
  test('keeps Mumbai hours', ({ assert }) => {
    const [day] = getCalendar('BSE').schedule('2024-06-03', '2024-06-03')
    assert.equal(day.market_open.toFormat('HH:mm'), '09:15')
    assert.equal(day.market_close.toFormat('HH:mm'), '15:30')
    assert.equal(getCalendar('XBOM').name, 'BSE')
  })

  test('observes the listed 2024 closures', ({ assert }) => {
    assert.deepEqual(
      getCalendar('BSE')
        .holidays('2024-01-01', '2024-12-31')
        .map((d) => d.toISODate()),
      [
        '2024-01-26', // Republic Day
        '2024-03-08', // Mahashivratri
        '2024-03-25', // Holi
        '2024-03-29', // Good Friday
        '2024-04-11', // Id-ul-Fitr
        '2024-04-17', // Ram Navami
        '2024-05-01', // Maharashtra Day
        '2024-05-20', // general election
        '2024-06-17', // Bakri Id
        '2024-07-17', // Muharram
        '2024-08-15', // Independence Day
        '2024-10-02', // Gandhi Jayanti
        '2024-11-01', // Diwali
        '2024-11-15', // Gurunanak Jayanti
        '2024-12-25',
      ],
    )
  })

  test('NSE keeps the same days as BSE', ({ assert }) => {
    const days = (name: string) =>
      getCalendar(name)
        .validDays('2024-01-01', '2024-12-31')
        .map((d) => d.toISODate())
    assert.deepEqual(days('NSE'), days('BSE'))
    assert.equal(getCalendar('xnse').name, 'NSE')
  })
})

test.group('HKEX calendar', () => {
  const hkex = getCalendar('HKEX')
  const holidays = (year: number) =>
    hkex.holidays(`${year}-01-01`, `${year}-12-31`).map((d) => d.toISODate())

  test('breaks for lunch', ({ assert }) => {
    const [day] = hkex.schedule('2024-06-03', '2024-06-03')
    assert.equal(day.market_open.toFormat('HH:mm'), '09:30')
    assert.equal(day.break_start.toFormat('HH:mm'), '12:00')
    assert.equal(day.break_end.toFormat('HH:mm'), '13:00')
    assert.equal(day.market_close.toFormat('HH:mm'), '16:00')
    assert.equal(getCalendar('XHKG').name, 'HKEX')
  })

  test('observes the 2024 holidays', ({ assert }) => {
    assert.deepEqual(holidays(2024), [
      '2024-01-01',
      '2024-02-10',
      '2024-02-12',
      '2024-02-13', // Lunar New Year
      '2024-03-29',
      '2024-04-01', //               Easter
      '2024-04-04', //                             Ching Ming
      '2024-05-01',
      '2024-05-15', //                             Buddha's birthday
      '2024-06-10', //                             Dragon Boat
      '2024-07-01', //                             HKSAR establishment
      '2024-09-18', //                             day after Mid-Autumn
      '2024-10-01', //                             National Day
      '2024-10-11', //                             Chung Yeung
      '2024-12-25',
      '2024-12-26',
    ])
  })

  test('tracks the lunar festivals from year to year', ({ assert }) => {
    // The Lunar New Year moves by weeks between years.
    assert.include(holidays(2024), '2024-02-10')
    assert.include(holidays(2023), '2023-01-23')
    // Ching Ming likewise.
    assert.include(holidays(2024), '2024-04-04')
    assert.include(holidays(2023), '2023-04-05')
  })

  test('puts the Queen’s Birthday on a Monday in June', ({ assert }) => {
    // The third Monday of June 1990.
    assert.deepEqual(
      hkex.holidays('1990-06-01', '1990-06-30').map((d) => d.toISODate()),
      ['1990-06-18'],
    )
  })

  test('closes for the listed one-off days', ({ assert }) => {
    // Hong Kong shuts for typhoons, which no rule describes.
    assert.include(holidays(2023), '2023-09-08')
  })
})

test.group('SSE calendar', () => {
  const sse = getCalendar('SSE')
  const holidays = (year: number) =>
    sse.holidays(`${year}-01-01`, `${year}-12-31`).map((d) => d.toISODate())

  test('breaks for lunch', ({ assert }) => {
    const [day] = sse.schedule('2024-06-03', '2024-06-03')
    assert.equal(day.market_open.toFormat('HH:mm'), '09:30')
    assert.equal(day.break_start.toFormat('HH:mm'), '11:30')
    assert.equal(day.break_end.toFormat('HH:mm'), '13:00')
    assert.equal(day.market_close.toFormat('HH:mm'), '15:00')
    assert.equal(getCalendar('XSHG').name, 'SSE')
  })

  test('observes the published 2024 closures', ({ assert }) => {
    assert.deepEqual(holidays(2024), [
      '2024-01-01',
      '2024-02-09',
      '2024-02-12',
      '2024-02-13',
      '2024-02-14',
      '2024-02-15',
      '2024-02-16', //               Spring Festival
      '2024-04-04',
      '2024-04-05', //               Qingming
      '2024-05-01',
      '2024-05-02',
      '2024-05-03', // Labour Day
      '2024-06-10', //                             Dragon Boat
      '2024-09-16',
      '2024-09-17', //               Mid-Autumn
      '2024-10-01',
      '2024-10-02',
      '2024-10-03',
      '2024-10-04',
      '2024-10-07', //               National Day
    ])
  })

  test('takes long runs around a festival', ({ assert }) => {
    // 2025's Spring Festival runs from 28 January into February.
    const y2025 = holidays(2025)
    assert.include(y2025, '2025-01-28')
    assert.include(y2025, '2025-02-04')
    assert.include(y2025, '2025-10-08') // and National Day into October
  })

  test('falls back on the guessed rules past the list', ({ assert }) => {
    // The published arrangement runs out in 2026, so 2028 comes from rules.
    const y2028 = holidays(2028)
    assert.isAbove(y2028.length, 20)
    assert.include(y2028, '2028-10-01') // National Day, a fixed date
    assert.include(y2028, '2028-01-26') // Spring Festival, from the lunar table
  })
})

test.group('the whole registry', () => {
  test('every registered name builds a working calendar', ({ assert }) => {
    const names = calendarNames()
    assert.isAbove(names.length, 90)

    for (const name of names) {
      const cal = getCalendar(name)
      const [day] = cal.schedule('2024-06-03', '2024-06-05')
      assert.isDefined(day, `${name} produced no schedule`)
      assert.isTrue(
        day.market_open < day.market_close,
        `${name} opens after it closes`,
      )
    }
  })
})

test.group('the last CME calendars', () => {
  test('CME_TradeDate is the settlement business-day calendar', ({
    assert,
  }) => {
    const cal = getCalendar('CME_TradeDate')
    const [day] = cal.schedule('2024-06-03', '2024-06-03')
    // Its hours are nominal: it exists to say which days are business days.
    assert.equal(day.market_open.toFormat('ccc dd HH:mm'), 'Sun 02 17:00')
    assert.deepEqual(
      cal.holidays('2024-01-01', '2024-12-31').map((d) => d.toISODate()),
      [
        '2024-01-01',
        '2024-01-15',
        '2024-02-19',
        '2024-03-29',
        '2024-05-27',
        '2024-06-19',
        '2024-07-04',
        '2024-09-02',
        '2024-11-28',
        '2024-12-25',
      ],
    )
  })

  test('CME_Agriculture runs overnight and breaks', ({ assert }) => {
    const [day] = getCalendar('CME_Agriculture').schedule(
      '2024-06-03',
      '2024-06-03',
    )
    assert.equal(day.market_open.toFormat('ccc dd HH:mm'), 'Sun 02 19:00')
    assert.equal(day.break_start.toFormat('HH:mm'), '07:45')
    assert.equal(day.break_end.toFormat('HH:mm'), '08:30')
    assert.equal(day.market_close.toFormat('HH:mm'), '13:20')
  })

  test('CME_Agriculture shuts where the financial products shorten', ({
    assert,
  }) => {
    // Memorial Day closes the agricultural calendar outright; equities
    // merely close at noon.
    assert.lengthOf(
      getCalendar('CME_Agriculture').schedule('2024-05-27', '2024-05-27'),
      0,
    )
    assert.lengthOf(
      getCalendar('CME Globex Equity').schedule('2024-05-27', '2024-05-27'),
      1,
    )
  })

  test('resolves the aliases that were missing', ({ assert }) => {
    // NYSE serves the US equity indices; the energy calendar answers to
    // every product ticker it covers.
    for (const alias of ['NASDAQ', 'BATS', 'DJIA', 'DOW']) {
      assert.equal(getCalendar(alias).name, 'NYSE')
    }
    for (const alias of ['CL', 'NG', 'GC', 'SI', 'HG', 'ALI', 'TIO']) {
      assert.equal(getCalendar(alias).name, 'CME Globex Energy and Metals')
    }
    for (const alias of ['CBOT_Agriculture', 'NYMEX_Agriculture']) {
      assert.equal(getCalendar(alias).name, 'CME_Agriculture')
    }
  })
})
