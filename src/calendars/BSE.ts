import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import { BSEClosedDay } from '../holidays/in'

const indianHours = () =>
  new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [9, 15] }]],
    ['market_close', [{ from: null, value: [15, 30] }]],
  ])

/**
 * Bombay Stock Exchange.
 *
 * India's holidays follow several calendars at once, so they are listed
 * rather than derived.
 */
export class BSE extends MarketCalendar {
  static override aliases = ['BSE', 'XBOM']

  readonly name = 'BSE'
  override get fullName(): string {
    return 'Bombay Stock Exchange'
  }
  readonly tz = 'Asia/Kolkata'

  override regularMarketTimes = indianHours()
  override adhocHolidays = BSEClosedDay
}

/** National Stock Exchange of India, which keeps the same days and hours. */
export class NSE extends MarketCalendar {
  static override aliases = ['NSE', 'XNSE']

  readonly name = 'NSE'
  override get fullName(): string {
    return 'National Stock Exchange of India'
  }
  readonly tz = 'Asia/Kolkata'

  override regularMarketTimes = indianHours()
  override adhocHolidays = BSEClosedDay
}
