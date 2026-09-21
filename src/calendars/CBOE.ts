import { DateTime } from 'luxon'
import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import * as us from '../holidays/us'

/** The holidays every CBOE market closes for. */
const CBOE_HOLIDAYS = new HolidayCalendar([
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

/** The half-days every CBOE market observes, at a time each one sets. */
const CBOE_HALF_DAYS = new HolidayCalendar([
  us.MonTuesThursBeforeIndependenceDay,
  us.FridayAfterIndependenceDayPre2013,
  us.WednesdayBeforeIndependenceDayPost2013,
  us.USBlackFridayInOrAfter1993,
])

/** One-off closures CBOE shares with the wider US market. */
const CBOE_ADHOC = [
  ...us.HurricaneSandyClosings,
  ...us.USNationalDaysofMourning,
]

const times = (open: TimeOfDay, close: TimeOfDay) =>
  new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: open }]],
    ['market_close', [{ from: null, value: close }]],
  ])

/**
 * CBOE Futures Exchange.
 *
 * Extended hours are not modelled, as in the reference implementation.
 */
export class CFE extends MarketCalendar {
  static override aliases = ['CFE', 'CBOE_Futures']

  readonly name = 'CFE'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = times([8, 30], [15, 15])
  override regularHolidays = CBOE_HOLIDAYS
  override adhocHolidays: DateTime[] = CBOE_ADHOC
  override specialTimes = {
    market_close: [{ time: [12, 15] as TimeOfDay, calendar: CBOE_HALF_DAYS }],
  }
}

/** CBOE equity options, which close a quarter hour before the futures do. */
export class CBOEEquityOptions extends MarketCalendar {
  static override aliases = ['CBOE_Equity_Options']

  readonly name = 'CBOE_Equity_Options'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = times([8, 30], [15, 0])
  override regularHolidays = CBOE_HOLIDAYS
  override adhocHolidays: DateTime[] = CBOE_ADHOC
  override specialTimes = {
    market_close: [{ time: [12, 0] as TimeOfDay, calendar: CBOE_HALF_DAYS }],
  }
}

/** CBOE index options, which keep the futures hours but close earlier on half-days. */
export class CBOEIndexOptions extends MarketCalendar {
  static override aliases = ['CBOE_Index_Options']

  readonly name = 'CBOE_Index_Options'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = times([8, 30], [15, 15])
  override regularHolidays = CBOE_HOLIDAYS
  override adhocHolidays: DateTime[] = CBOE_ADHOC
  override specialTimes = {
    market_close: [{ time: [12, 0] as TimeOfDay, calendar: CBOE_HALF_DAYS }],
  }
}
