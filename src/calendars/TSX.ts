import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import { GoodFriday } from '../holidays/us'
import { BoxingDay, WeekendBoxingDay, WeekendChristmas } from '../holidays/uk'
import * as ca from '../holidays/ca'

/**
 * Toronto Stock Exchange.
 *
 * Canada keeps Boxing Day as the UK does, so those rules are shared, but its
 * Thanksgiving is the second Monday of October rather than the fourth
 * Thursday of November. From 2010 a weekday Christmas Eve closes at 13:00.
 */
export class TSX extends MarketCalendar {
  static override aliases = ['TSX', 'TSXV', 'XTSE']

  readonly name = 'TSX'
  readonly tz = 'America/Toronto'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [9, 30] }]],
    ['market_close', [{ from: null, value: [16, 0] }]],
  ])

  override regularHolidays = new HolidayCalendar([
    ca.TSXNewYearsDay,
    ca.FamilyDay,
    GoodFriday,
    ca.VictoriaDay,
    ca.CanadaDay,
    ca.CivicHoliday,
    ca.CanadianLabourDay,
    ca.CanadianThanksgiving,
    ca.CanadianChristmas,
    WeekendChristmas,
    BoxingDay,
    WeekendBoxingDay,
  ])

  override adhocHolidays = [...ca.September11Closings2001]

  override specialTimes = {
    market_close: [
      {
        time: [13, 0] as TimeOfDay,
        calendar: new HolidayCalendar([ca.ChristmasEveEarlyClose2010Onwards]),
      },
    ],
  }
}
