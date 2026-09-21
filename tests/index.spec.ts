import { test } from '@japa/runner'
import { DateTime, Duration } from 'luxon'
import { getCalendar, calendarNames, NYSE } from '../src'
import {
  MarketCalendar,
  OpenAtTimeOptions,
  TimeOfDay,
} from '../src/core/MarketCalendar'
import { ProtectedDict } from '../src/core/classRegistry'
import { Dated } from '../src/utils/dated'

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
import {
  dateRange,
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
    // Saturday 1952-09-27 is the last Saturday session; 1952-10-04 is not one.
    const days = iso(nyse().validDays('1952-09-26', '1952-10-04'))
    assert.include(days, '1952-09-27')
    assert.notInclude(days, '1952-10-04')
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

  test('leaves the post session alone on 14:00 closes', ({ assert }) => {
    // The pre-1993 Christmas Eve close is not one of the 1pm rules.
    assert.deepEqual(columns('1992-12-24'), {
      pre: '04:00',
      open: '09:30',
      close: '14:00',
      post: '20:00',
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
