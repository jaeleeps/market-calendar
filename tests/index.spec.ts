import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { getCalendar, calendarNames, NYSE } from '../src'
import { weekdayOffset, easterSunday } from '../src/utils/rules'
import { Weekday } from '../src/utils/constants'
import { markSession } from '../src/utils/calendarUtils'

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

test.group('markSession', () => {
  test('labels timestamps against their own session day', ({ assert }) => {
    const schedule = nyse().schedule('2024-07-02', '2024-07-05')
    const stamps = [
      et('2024-07-02T10:00'),
      et('2024-07-03T15:00'), // after the 13:00 early close
      et('2024-07-04T10:00'), // holiday, not in the schedule
      et('2024-07-05T10:00'),
    ]

    assert.deepEqual(Object.values(markSession(schedule, stamps)), [
      'rth',
      'closed',
      'closed',
      'rth',
    ])
  })
})
