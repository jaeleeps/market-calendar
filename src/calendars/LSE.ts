import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import * as uk from '../holidays/uk'

/**
 * London Stock Exchange.
 *
 * The bank holidays move: the May and Spring holidays were each shifted for
 * a jubilee or a royal occasion more than once, so both are stated once per
 * era. Christmas and Boxing Day falling at a weekend push the closure to the
 * following weekdays.
 */
export class LSE extends MarketCalendar {
  static override aliases = ['LSE', 'XLON']

  readonly name = 'LSE'
  readonly tz = 'Europe/London'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [8, 0] }]],
    ['market_close', [{ from: null, value: [16, 30] }]],
  ])

  override regularHolidays = new HolidayCalendar([
    uk.LSENewYearsDay,
    uk.GoodFriday,
    uk.EasterMonday,
    uk.MayBank_pre_1995,
    uk.MayBank_post_1995_pre_2020,
    uk.MayBank_post_2020,
    uk.SpringBank_pre_2002,
    uk.SpringBank_post_2002_pre_2012,
    uk.SpringBank_post_2012_pre_2022,
    uk.SpringBank_post_2022,
    uk.SummerBank,
    uk.Christmas,
    uk.WeekendChristmas,
    uk.BoxingDay,
    uk.WeekendBoxingDay,
  ])

  override adhocHolidays = [...uk.UniqueCloses]

  override specialTimes = {
    market_close: [
      {
        time: [12, 30] as TimeOfDay,
        calendar: new HolidayCalendar([uk.ChristmasEve, uk.LSENewYearsEve]),
      },
    ],
  }
}
