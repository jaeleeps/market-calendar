import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import { GoodFriday } from '../holidays/us'
import { EasterMonday } from '../holidays/uk'
import * as oz from '../holidays/oz'

/**
 * Australian Securities Exchange.
 *
 * Boxing Day follows Christmas onto the next free weekday, so a Christmas
 * that lands on a Saturday pushes the pair to the Monday and Tuesday.
 */
export class ASX extends MarketCalendar {
  static override aliases = ['ASX', 'XASX']

  readonly name = 'ASX'
  readonly tz = 'Australia/Sydney'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [10, 0] }]],
    ['market_close', [{ from: null, value: [16, 10] }]],
  ])

  override regularHolidays = new HolidayCalendar([
    oz.OZNewYearsDay,
    oz.AustraliaDay,
    GoodFriday,
    EasterMonday,
    oz.AnzacDay,
    oz.QueensBirthday,
    oz.OZChristmas,
    oz.OZBoxingDay,
  ])

  override adhocHolidays = [...oz.OZUniqueCloses]

  override specialTimes = {
    market_close: [
      {
        time: [14, 10] as TimeOfDay,
        calendar: new HolidayCalendar([oz.OZChristmasEve, oz.OZNewYearsEve]),
      },
    ],
  }
}
