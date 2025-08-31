import { XNYS } from '../src/calendars/XNYS'

console.log('Test file loaded')

import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { getCalendar } from '../src'

test('getCalendar returns XNYS instance', ({ assert }) => {
  const cal = getCalendar('XNYS')
  assert.equal(cal.constructor.name, 'XNYS')
})

test.group('XNYS Calendar', () => {
  test('market is open at 10:00 AM on normal day', ({ assert }) => {
    const cal = new XNYS()
    const dt = DateTime.fromISO('2024-07-02T10:00:00', {
      zone: 'America/New_York',
    })

    assert.isTrue(cal.isOpenOnMinute(dt))
  })

  test('market is closed on July 4 (holiday)', ({ assert }) => {
    const cal = new XNYS()
    const dt = DateTime.fromISO('2024-07-04T10:00:00', {
      zone: 'America/New_York',
    })

    assert.isFalse(cal.isOpenOnMinute(dt))
  })
})
