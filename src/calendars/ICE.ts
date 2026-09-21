import { DateTime } from 'luxon'
import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import * as us from '../holidays/us'

/**
 * ICE Futures US.
 *
 * The session opens at 20:01 the evening before its trade date and runs to
 * 18:00 the following day.
 */
export class ICE extends MarketCalendar {
  static override aliases = ['ICE', 'ICEUS', 'NYFE']

  readonly name = 'ICE'
  readonly tz = 'America/New_York'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [20, 1, -1] }]],
    ['market_close', [{ from: null, value: [18, 0] }]],
  ])

  override regularHolidays = new HolidayCalendar([
    us.USNewYearsDay,
    us.GoodFriday,
    us.Christmas,
  ])

  override adhocHolidays: DateTime[] = [
    ...us.USNationalDaysofMourning,
    // ICE shut for the first day of Hurricane Sandy but not the second.
    DateTime.fromISO('2012-10-29', { zone: 'utc' }),
  ]

  override specialTimes = {
    market_close: [
      {
        time: [13, 0] as TimeOfDay,
        calendar: new HolidayCalendar([
          us.USMartinLutherKingJrAfter1998,
          us.USPresidentsDay,
          us.USMemorialDay,
          us.USIndependenceDay,
          us.USLaborDay,
          us.USThanksgivingDay,
        ]),
      },
    ],
  }
}
