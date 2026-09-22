import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import { Weekday } from '../utils/constants'
import { TASEClosedDay } from '../holidays/il'

/**
 * Tel Aviv Stock Exchange.
 *
 * Its week runs Sunday to Thursday, and its holidays follow a lunar calendar
 * that cannot be stated as rules against Gregorian dates, so they are listed
 * rather than derived. The list runs to the end of 2025.
 */
export class TASE extends MarketCalendar {
  static override aliases = ['TASE', 'XTAE']

  readonly name = 'TASE'
  readonly tz = 'Asia/Jerusalem'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [10, 0] }]],
    ['market_close', [{ from: null, value: [15, 59] }]],
  ])

  override weekmask = [
    {
      from: null,
      value: [
        Weekday.SUNDAY,
        Weekday.MONDAY,
        Weekday.TUESDAY,
        Weekday.WEDNESDAY,
        Weekday.THURSDAY,
      ],
    },
  ]

  override adhocHolidays = TASEClosedDay
}
