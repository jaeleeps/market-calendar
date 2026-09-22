import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import { GoodFriday } from '../holidays/us'
import {
  EasterMonday,
  WeekendBoxingDay,
  WeekendChristmas,
} from '../holidays/uk'
import * as eu from '../holidays/eu'

const times = (open: TimeOfDay, close: TimeOfDay) =>
  new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: open }]],
    ['market_close', [{ from: null, value: close }]],
  ])

/**
 * SIX Swiss Exchange.
 *
 * Most of its holidays are simply skipped when they fall at a weekend rather
 * than moved, so they carry a weekday filter instead of an observance.
 */
export class SIX extends MarketCalendar {
  static override aliases = ['SIX', 'XSWX']

  readonly name = 'SIX'
  override get fullName(): string {
    return 'SIX Swiss Exchange'
  }
  readonly tz = 'Europe/Zurich'

  override regularMarketTimes = times([9, 0], [17, 30])

  override regularHolidays = new HolidayCalendar([
    eu.EUNewYearsDay,
    eu.BertholdsDay,
    GoodFriday,
    EasterMonday,
    eu.EUMayDay,
    eu.AscensionDay,
    eu.WhitMonday,
    eu.SwissNationalDay,
    eu.EUChristmasEve,
    eu.EUChristmas,
    eu.EUBoxingDay,
    eu.EUNewYearsEve,
  ])
}

/** The holidays every EUREX market closes for. */
const EUREX_HOLIDAYS = new HolidayCalendar([
  eu.EUNewYearsDay,
  GoodFriday,
  EasterMonday,
  eu.EUMayDay,
  eu.EUChristmas,
  WeekendChristmas,
  eu.EUBoxingDay,
  WeekendBoxingDay,
])

/** The days EUREX closes at 12:30. */
const EUREX_HALF_DAYS = new HolidayCalendar([
  eu.EUChristmasEve,
  eu.EUNewYearsEve,
])

/** EUREX derivatives. */
export class EUREX extends MarketCalendar {
  static override aliases = ['EUREX']

  readonly name = 'EUREX'
  readonly tz = 'Europe/Berlin'

  override regularMarketTimes = times([8, 0], [22, 0])
  override regularHolidays = EUREX_HOLIDAYS
  override specialTimes = {
    market_close: [{ time: [12, 30] as TimeOfDay, calendar: EUREX_HALF_DAYS }],
  }
}

/** EUREX with its pre and post sessions, which run a shorter core. */
export class EUREXPrePost extends MarketCalendar {
  static override aliases = ['EUREX_PrePost', 'EUREX_Extended']

  readonly name = 'EUREX_PrePost'
  readonly tz = 'Europe/Berlin'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['pre', [{ from: null, value: [0, 15] }]],
    ['market_open', [{ from: null, value: [8, 0] }]],
    ['market_close', [{ from: null, value: [16, 30] }]],
    ['post', [{ from: null, value: [21, 0] }]],
  ])

  override regularHolidays = EUREX_HOLIDAYS
  override specialTimes = {
    market_close: [{ time: [12, 30] as TimeOfDay, calendar: EUREX_HALF_DAYS }],
  }
}

/**
 * EUREX fixed income.
 *
 * It trades through the night and skips its holidays at a weekend rather
 * than moving them, so Christmas Eve and New Year's Eve are full closures
 * here where the derivatives market only closes early.
 */
export class EUREXBond extends MarketCalendar {
  static override aliases = ['EUREX_Bond']

  readonly name = 'EUREX_Bond'
  readonly tz = 'Europe/Berlin'

  override regularMarketTimes = times([1, 10], [22, 0])

  override regularHolidays = new HolidayCalendar([
    eu.EUNewYearsDay,
    GoodFriday,
    EasterMonday,
    eu.EUMayDay,
    eu.EUChristmasEveWeekday,
    eu.EUChristmas,
    eu.EUBoxingDayWeekday,
    eu.EUNewYearsEveWeekday,
  ])
}

/**
 * Oslo Stock Exchange.
 *
 * Norway keeps a long Easter: the exchange closes from Maundy Thursday and
 * shuts early on the Wednesday before it.
 */
export class OSE extends MarketCalendar {
  static override aliases = ['OSE', 'XOSL']

  readonly name = 'OSE'
  override get fullName(): string {
    return 'Oslo Stock Exchange'
  }
  readonly tz = 'Europe/Oslo'

  override regularMarketTimes = times([9, 0], [16, 20])

  override regularHolidays = new HolidayCalendar([
    eu.OSENewYearsDay,
    eu.MaundyThursday,
    GoodFriday,
    EasterMonday,
    eu.NorwayLabourDay,
    eu.NorwayConstitutionDay,
    eu.WhitMonday,
    eu.AscensionDay,
    eu.OSEChristmasEve,
    eu.OSEChristmas,
    eu.OSEBoxingDay,
    eu.OSENewYearsEve,
  ])

  override specialTimes = {
    market_close: [
      {
        time: [13, 0] as TimeOfDay,
        calendar: new HolidayCalendar([eu.WednesdayBeforeEaster]),
      },
    ],
  }
}
