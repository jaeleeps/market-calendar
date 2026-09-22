import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import { SSEClosedDay } from '../holidays/cnHolidays'
import { SSEForwardHolidays } from '../holidays/sse'

/**
 * Shanghai Stock Exchange.
 *
 * Breaks for lunch between half past eleven and one.
 *
 * China publishes its holiday arrangement one year at a time, moving days
 * about to make long weekends, so every known closure is a listed date
 * rather than a rule. The rules only begin where that list runs out, and are
 * the reference implementation's guess at the pattern.
 */
export class SSE extends MarketCalendar {
  static override aliases = ['SSE', 'XSHG']

  readonly name = 'SSE'
  readonly tz = 'Asia/Shanghai'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [9, 30] }]],
    ['break_start', [{ from: null, value: [11, 30] }]],
    ['break_end', [{ from: null, value: [13, 0] }]],
    ['market_close', [{ from: null, value: [15, 0] }]],
  ])

  override regularHolidays = new HolidayCalendar(SSEForwardHolidays)
  override adhocHolidays = SSEClosedDay
}
