import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import { Weekday } from '../utils/constants'

/**
 * The foreign exchange market.
 *
 * It has no holidays and trades continuously from Sunday evening to Friday
 * evening, so a trade date opens at 17:00 the day before and the week
 * includes Sunday.
 */
export class Forex extends MarketCalendar {
  static override aliases = ['FOREX', 'FX', 'Forex']

  readonly name = 'FOREX'
  readonly tz = 'America/New_York'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [17, 0, -1] }]],
    ['market_close', [{ from: null, value: [17, 0] }]],
  ])

  override weekmask = [
    {
      from: null,
      value: [
        Weekday.MONDAY,
        Weekday.TUESDAY,
        Weekday.WEDNESDAY,
        Weekday.THURSDAY,
        Weekday.FRIDAY,
        Weekday.SUNDAY,
      ],
    },
  ]
}
