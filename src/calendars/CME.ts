import { DateTime } from 'luxon'
import {
  MarketCalendar,
  TimeOfDay,
  MarketTimeKey,
} from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import * as us from '../holidays/us'
import * as cme from '../holidays/cme'

/** CME shortened its equity session between these two dates. */
const LEGACY_HOURS_START = '2005-09-12'
const MODERN_HOURS_START = '2012-11-19'

/** The holidays that close CME outright, shared by its products. */
const CLOSED_ALL_DAY = [us.USNewYearsDay, us.Christmas]

/** The half-days every CME product observes at 12:00. */
const NOON_CLOSE_RULES = [
  us.USMartinLutherKingJrAfter1998,
  us.USPresidentsDay,
  us.USMemorialDay,
  us.USLaborDay,
  us.USIndependenceDay,
  us.USThanksgivingDay,
]

/**
 * CME equity index futures.
 *
 * The session opens the evening before its trade date and runs through the
 * following afternoon, with a short break either side of the settlement.
 * Both the open and the break moved twice: at the 2005 move to Globex and
 * again when the hours changed in 2012.
 */
export class CMEEquity extends MarketCalendar {
  static override aliases = ['CME_Equity', 'CBOT_Equity']

  readonly name = 'CME_Equity'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    [
      'market_open',
      [
        { from: null, value: [17, 0, -1] },
        { from: LEGACY_HOURS_START, value: [15, 30, -1] },
        { from: MODERN_HOURS_START, value: [17, 0, -1] },
      ],
    ],
    ['break_start', [{ from: null, value: [15, 15] }]],
    [
      'break_end',
      [
        { from: null, value: [15, 30] },
        { from: LEGACY_HOURS_START, value: [15, 15] },
        { from: MODERN_HOURS_START, value: [15, 30] },
      ],
    ],
    [
      'market_close',
      [
        { from: null, value: [16, 0] },
        { from: LEGACY_HOURS_START, value: [15, 15] },
        { from: MODERN_HOURS_START, value: [16, 0] },
      ],
    ],
  ])

  override regularHolidays = new HolidayCalendar([
    ...CLOSED_ALL_DAY,
    cme.GoodFridayBefore2021NotEarlyClose,
    cme.GoodFriday2022,
  ])

  override adhocHolidays = [...us.USNationalDaysofMourning]

  override specialTimes: Partial<
    Record<MarketTimeKey, { time: TimeOfDay; calendar?: HolidayCalendar }[]>
  > = {
    market_close: [
      {
        time: [8, 15],
        calendar: new HolidayCalendar([
          ...cme.GoodFridayEarlyCloseYears,
          cme.GoodFridayAfter2022,
        ]),
      },
      {
        time: [12, 0],
        calendar: new HolidayCalendar([
          ...NOON_CLOSE_RULES,
          us.USJuneteenthAfter2022,
          cme.USIndependenceDayBefore2022PreviousDay,
          us.USBlackFridayInOrAfter1993,
          us.ChristmasEveBefore1993,
          us.ChristmasEveInOrAfter1993,
        ]),
      },
    ],
  }
}

/**
 * CME interest rate and bond futures.
 *
 * Accurate for the electronic session from roughly 2010. Good Friday is
 * listed year by year: the bond markets closed for some and traded a morning
 * session on others.
 */
export class CMEBond extends MarketCalendar {
  static override aliases = [
    'CME_Bond',
    'CBOT_Bond',
    'CME_Rate',
    'CBOT_Rate',
    'CME_InterestRate',
    'CBOT_InterestRate',
  ]

  readonly name = 'CME_Bond'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [17, 0, -1] }]],
    ['market_close', [{ from: null, value: [16, 0] }]],
  ])

  override regularHolidays = new HolidayCalendar(CLOSED_ALL_DAY)

  override adhocHolidays: DateTime[] = [
    ...us.USNationalDaysofMourning,
    ...cme.BondsGoodFridayClosed,
  ]

  override specialTimes: Partial<
    Record<
      MarketTimeKey,
      { time: TimeOfDay; calendar?: HolidayCalendar; adhocDates?: DateTime[] }[]
    >
  > = {
    market_close: [
      { time: [10, 0], adhocDates: cme.BondsGoodFridayOpen },
      { time: [12, 0], calendar: new HolidayCalendar(NOON_CLOSE_RULES) },
      {
        time: [12, 15],
        calendar: new HolidayCalendar([
          us.USBlackFridayInOrAfter1993,
          us.ChristmasEveBefore1993,
          us.ChristmasEveInOrAfter1993,
        ]),
      },
    ],
  }
}
