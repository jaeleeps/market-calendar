import { DateTime } from 'luxon'
import { DateLike, MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import * as us from '../holidays/us'

/** IEX began trading on this date; nothing before it is a session. */
const FIRST_SESSION = '2013-08-25'

/**
 * Investors Exchange.
 *
 * The holidays are the NYSE's, but only the modern rules matter: IEX opened
 * in 2013. Its pre-market starts at 08:00 and its post-market ends at 17:00,
 * both shorter than the NYSE's.
 */
export class IEX extends MarketCalendar {
  static override aliases = ['IEX', 'Investors_Exchange']

  readonly name = 'IEX'
  override get fullName(): string {
    return "Investor's Exchange"
  }
  readonly tz = 'America/New_York'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['pre', [{ from: '2013-03-25', value: [8, 0] }]],
    ['market_open', [{ from: null, value: [9, 30] }]],
    ['market_close', [{ from: null, value: [16, 0] }]],
    ['post', [{ from: null, value: [17, 0] }]],
  ])

  override regularHolidays = new HolidayCalendar([
    us.USNewYearsDay,
    us.USMartinLutherKingJrAfter1998,
    us.USPresidentsDay,
    us.GoodFriday,
    us.USMemorialDay,
    us.USJuneteenthAfter2022,
    us.USIndependenceDay,
    us.USLaborDay,
    us.USThanksgivingDay,
    us.Christmas,
  ])

  override adhocHolidays = [...us.ChristmasEvesAdhoc]

  override specialTimes = {
    market_close: [
      {
        time: [13, 0] as TimeOfDay,
        calendar: new HolidayCalendar([us.USBlackFridayInOrAfter1993]),
        // The 2013 Independence Day half day, which no rule covers.
        adhocDates: [DateTime.fromISO('2013-07-03', { zone: 'utc' })],
      },
    ],
  }

  /**
   * Trading days, never earlier than the exchange's first session.
   *
   * @param start Start date (inclusive)
   * @param end End date (inclusive)
   * @returns Session dates from the later of `start` and the opening date
   */
  override validDays(start: DateLike, end: DateLike): DateTime[] {
    const opened = DateTime.fromISO(FIRST_SESSION, { zone: this.tz })
    const from =
      typeof start === 'string'
        ? DateTime.fromISO(start, { zone: this.tz })
        : start
    return super.validDays(from > opened ? from : opened, end)
  }
}
