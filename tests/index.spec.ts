import { test } from '@japa/runner'
import { DateTime, Duration } from 'luxon'
import { getCalendar, calendarNames, NYSE } from '../src'
import { weekdayOffset, easterSunday } from '../src/utils/rules'
import { Weekday } from '../src/utils/constants'
import { dateRange, markSession } from '../src/utils/calendarUtils'
import {
  MissingSessionWarning,
  filterDateRangeWarnings,
  resetDateRangeWarnings,
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
  test('is open during regular hours only', ({ assert }) => {
    const cal = nyse()
    assert.isTrue(cal.openAtTime(et('2024-07-02T10:00')))
    assert.isTrue(cal.openAtTime(et('2024-07-02T09:30')))
    assert.isTrue(cal.openAtTime(et('2024-07-02T16:00')))
    assert.isFalse(cal.openAtTime(et('2024-07-02T09:29')))
    assert.isFalse(cal.openAtTime(et('2024-07-02T16:01')))
  })

  test('is closed on holidays and early-close afternoons', ({ assert }) => {
    const cal = nyse()
    assert.isFalse(cal.openAtTime(et('2024-07-04T10:00')))
    assert.isFalse(cal.openAtTime(et('2024-07-06T10:00'))) // Saturday
    assert.isTrue(cal.openAtTime(et('2024-07-03T12:59')))
    assert.isFalse(cal.openAtTime(et('2024-07-03T13:01')))
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

  test('openAtTime still means regular hours only', ({ assert }) => {
    const cal = nyse()
    assert.isFalse(cal.openAtTime(et('2024-07-02T05:00'))) // pre-market
    assert.isTrue(cal.openAtTime(et('2024-07-02T10:00')))
    assert.isFalse(cal.openAtTime(et('2024-07-02T18:00'))) // post-market
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
  group.each.teardown(() => resetDateRangeWarnings())

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
    filterDateRangeWarnings('error')
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
    filterDateRangeWarnings('error')
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
    filterDateRangeWarnings('error')
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
    filterDateRangeWarnings('ignore')
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
