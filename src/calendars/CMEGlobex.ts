import { DateTime } from 'luxon'
import {
  MarketCalendar,
  MarketTimeKey,
  SpecialTime,
  TimeOfDay,
} from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import * as us from '../holidays/us'
import * as cme from '../holidays/cme'
import * as gx from '../holidays/cmeGlobex'

/** The overnight session most Globex products keep. */
const overnight = () =>
  new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [17, 0, -1] }]],
    ['market_close', [{ from: null, value: [16, 0] }]],
  ])

/** Shorthand for a special close driven by a set of rules. */
const closesAt = (time: TimeOfDay, rules: unknown[]): SpecialTime => ({
  time,
  calendar: new HolidayCalendar(rules as never[]),
})

type Closes = Partial<Record<MarketTimeKey, SpecialTime[]>>

/**
 * CME Globex equity index futures.
 *
 * Globex reworked its schedule twice, in 2014 and again in 2022, so most
 * holidays appear here in two forms with the eras marked and a different
 * close time on each side.
 */
export class CMEGlobexEquities extends MarketCalendar {
  static override aliases = ['CME Globex Equity', 'CMEGlobex_Equity']

  readonly name = 'CME Globex Equity'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = overnight()

  override regularHolidays = new HolidayCalendar([
    gx.USNewYearsDay,
    cme.GoodFridayBefore2021NotEarlyClose,
    cme.GoodFriday2022,
    us.Christmas,
  ])

  override specialTimes: Closes = {
    market_close: [
      closesAt(
        [10, 30],
        [
          cme.USMartinLutherKingJrAfter1998Before2015,
          cme.USPresidentsDayBefore2015,
          cme.USMemorialDay2013AndPrior,
          cme.USIndependenceDayBefore2014,
          cme.USLaborDayStarting1887Before2014,
          cme.USThanksgivingBefore2014,
        ],
      ),
      closesAt(
        [12, 0],
        [
          cme.USMartinLutherKingJrAfter2015,
          cme.USPresidentsDayAfter2015,
          cme.USMemorialDayAfter2013,
          cme.USIndependenceDayAfter2014,
          cme.USLaborDayStarting1887After2014,
          cme.USThanksgivingAfter2014,
          us.USJuneteenthAfter2022,
        ],
      ),
      closesAt(
        [12, 15],
        [
          cme.USIndependenceDayBefore2022PreviousDay,
          cme.USThanksgivingFriday,
          us.ChristmasEveInOrAfter1993,
        ],
      ),
      closesAt(
        [8, 15],
        [
          cme.GoodFriday2010,
          cme.GoodFriday2012,
          cme.GoodFriday2015,
          cme.GoodFriday2021,
          cme.GoodFridayAfter2022,
        ],
      ),
    ],
  }
}

/** CME Globex interest rate and bond futures. */
export class CMEGlobexFixedIncome extends MarketCalendar {
  static override aliases = [
    'CME Globex Fixed Income',
    'CME Globex Interest Rate Products',
  ]

  readonly name = 'CME Globex Fixed Income'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = overnight()

  override regularHolidays = new HolidayCalendar([
    gx.USNewYearsDay,
    cme.GoodFridayBefore2021NotEarlyClose,
    cme.GoodFriday2022,
    us.Christmas,
  ])

  override specialTimes: Closes = {
    market_close: [
      closesAt(
        [12, 0],
        [
          cme.USMartinLutherKingJrAfter1998Before2015,
          cme.USMartinLutherKingJrAfter2015,
          cme.USPresidentsDayBefore2015,
          cme.USPresidentsDayAfter2015,
          cme.USMemorialDay2013AndPrior,
          cme.USMemorialDayAfter2013,
          cme.USIndependenceDayBefore2014,
          cme.USIndependenceDayAfter2014,
          cme.USLaborDayStarting1887Before2014,
          cme.USLaborDayStarting1887After2014,
          cme.USThanksgivingBefore2014,
          cme.USThanksgivingAfter2014,
          us.USJuneteenthAfter2022,
        ],
      ),
      closesAt(
        [15, 15],
        [
          cme.USMartinLutherKingJrAfter1998Before2016FridayBefore,
          cme.USPresidentsDayBefore2016FridayBefore,
          cme.GoodFriday2009,
          cme.USMemorialDay2015AndPriorFridayBefore,
          cme.USLaborDayStarting1887Before2015FridayBefore,
        ],
      ),
      closesAt(
        [12, 15],
        [cme.USThanksgivingFriday, us.ChristmasEveInOrAfter1993],
      ),
      closesAt(
        [10, 15],
        [
          cme.GoodFriday2010,
          cme.GoodFriday2012,
          cme.GoodFriday2015,
          cme.GoodFriday2021,
          cme.GoodFridayAfter2022,
        ],
      ),
      // Two half-days either side of Independence Day, and one year end.
      {
        time: [15, 15],
        adhocDates: ['2010-07-02', '2011-07-01'].map((d) =>
          DateTime.fromISO(d, { zone: 'utc' }),
        ),
      },
      {
        time: [12, 15],
        adhocDates: [DateTime.fromISO('2010-12-31', { zone: 'utc' })],
      },
    ],
  }
}

/** CME Globex FX futures. */
export class CMEGlobexFX extends MarketCalendar {
  static override aliases = ['CMEGlobex_FX', 'CME_FX', 'CME_Currency']

  readonly name = 'CME Globex FX'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = overnight()

  override regularHolidays = new HolidayCalendar([
    gx.USNewYearsDay,
    cme.GoodFridayBefore2021,
    cme.GoodFriday2022,
    us.Christmas,
  ])

  override specialTimes: Closes = {
    market_close: [
      closesAt([10, 15], [cme.GoodFriday2021, cme.GoodFridayAfter2022]),
      closesAt(
        [12, 0],
        [
          cme.USMartinLutherKingJrAfter1998Before2022,
          cme.USPresidentsDayBefore2022,
          cme.USMemorialDay2021AndPrior,
          cme.USIndependenceDayBefore2022,
          cme.USLaborDayStarting1887Before2022,
          cme.USThanksgivingBefore2022,
        ],
      ),
      closesAt(
        [12, 15],
        [cme.USThanksgivingFriday, us.ChristmasEveInOrAfter1993],
      ),
    ],
  }
}

/** CME Globex energy and metals futures. */
export class CMEGlobexEnergyAndMetals extends MarketCalendar {
  static override aliases = [
    'CMEGlobex_EnergyAndMetals',
    'CMEGlobex_Energy',
    'CMEGlobex_CrudeAndRefined',
    'CMEGlobex_NYHarbor',
    'CMEGlobex_HO',
    'HO',
    'CMEGlobex_Crude',
    'CMEGlobex_CL',
    'CL',
    'CMEGlobex_Gas',
    'CMEGlobex_RB',
    'RB',
    'CMEGlobex_MicroCrude',
    'CMEGlobex_MCL',
    'MCL',
    'CMEGlobex_NatGas',
    'CMEGlobex_NG',
    'NG',
    'CMEGlobex_Dutch_NatGas',
    'CMEGlobex_TTF',
    'TTF',
    'CMEGlobex_LastDay_NatGas',
    'CMEGlobex_NN',
    'NN',
    'CMEGlobex_CarbonOffset',
    'CMEGlobex_CGO',
    'CGO',
    'C-GEO',
    'CMEGlobex_NGO',
    'NGO',
    'CMEGlobex_GEO',
    'GEO',
    'CMEGlobex_Metals',
    'CMEGlobex_PreciousMetals',
    'CMEGlobex_Gold',
    'CMEGlobex_GC',
    'GC',
    'CMEGlobex_Silver',
    'CMEGlobex_SI',
    'SI',
    'CMEGlobex_Platinum',
    'CMEGlobex_PL',
    'PL',
    'CMEGlobex_BaseMetals',
    'CMEGlobex_Copper',
    'CMEGlobex_HG',
    'HG',
    'CMEGlobex_Aluminum',
    'CMEGlobex_ALI',
    'ALI',
    'CMEGlobex_QC',
    'QC',
    'CMEGlobex_FerrousMetals',
    'CMEGlobex_HRC',
    'HRC',
    'CMEGlobex_BUS',
    'BUS',
    'CMEGlobex_TIO',
    'TIO',
  ]

  readonly name = 'CME Globex Energy and Metals'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = overnight()

  override regularHolidays = new HolidayCalendar([
    gx.USNewYearsDay,
    gx.GoodFriday,
    gx.ChristmasCME,
  ])

  override adhocHolidays = [...us.USNationalDaysofMourning]

  override specialTimes: Closes = {
    market_close: [
      closesAt(
        [12, 0],
        [
          gx.USMartinLutherKingJrPre2022,
          gx.USPresidentsDayPre2022,
          gx.USMemorialDayPre2022,
          gx.USIndependenceDayPre2022,
          gx.USLaborDay,
          gx.USThanksgivingDayPre2022,
        ],
      ),
      closesAt([12, 45], [gx.FridayAfterThanksgiving]),
      closesAt(
        [13, 30],
        [
          gx.USMartinLutherKingJrFrom2022,
          gx.USPresidentsDayFrom2022,
          gx.USMemorialDayFrom2022,
          gx.USJuneteenthFrom2022,
          gx.USIndependenceDayFrom2022,
          gx.USThanksgivingDayFrom2022,
        ],
      ),
    ],
  }
}

/** CME Globex cryptocurrency futures. */
export class CMEGlobexCrypto extends MarketCalendar {
  static override aliases = ['CME Globex Cryptocurrencies', 'CME Globex Crypto']

  readonly name = 'CME Globex Crypto'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = overnight()

  override regularHolidays = new HolidayCalendar([
    cme.GoodFridayBefore2021,
    cme.GoodFriday2022,
    gx.ChristmasCME,
    gx.USNewYearsDay,
  ])

  override specialTimes: Closes = {
    market_close: [
      closesAt([8, 15], [cme.GoodFriday2021]),
      closesAt([10, 15], [cme.GoodFridayAfter2022]),
      closesAt(
        [12, 0],
        [
          gx.USMartinLutherKingJrPre2022,
          gx.USPresidentsDayPre2022,
          gx.USMemorialDayPre2022,
          gx.USIndependenceDayPre2022,
          gx.USLaborDayPre2022,
          gx.USThanksgivingDayPre2022,
        ],
      ),
      closesAt(
        [12, 15],
        [
          us.ChristmasEveInOrAfter1993,
          cme.USIndependenceDayBefore2022PreviousDay,
          gx.USThanksgivingFridayPre2021,
        ],
      ),
      closesAt([12, 45], [gx.USThanksgivingFridayFrom2021]),
      closesAt(
        [16, 0],
        [
          gx.USMartinLutherKingJrFrom2022,
          gx.USPresidentsDayFrom2022,
          gx.USMemorialDayFrom2022,
          gx.USJuneteenthFrom2022,
          gx.USIndependenceDayFrom2022,
          gx.USLaborDayFrom2022,
          gx.USThanksgivingDayFrom2022,
        ],
      ),
    ],
  }
}

/** The holidays the agricultural products close for outright. */
const AGRICULTURE_HOLIDAYS = new HolidayCalendar([
  us.USNewYearsDay,
  us.USMartinLutherKingJrAfter1998,
  us.USPresidentsDay,
  us.GoodFriday,
  us.USMemorialDay,
  us.USIndependenceDay,
  us.USLaborDay,
  us.USThanksgivingDay,
  us.Christmas,
])

/** CME Globex livestock futures, which trade a daytime session only. */
export class CMEGlobexLivestock extends MarketCalendar {
  static override aliases = [
    'CMEGlobex_Livestock',
    'CMEGlobex_Live_Cattle',
    'CMEGlobex_Feeder_Cattle',
    'CMEGlobex_Lean_Hog',
    'CMEGlobex_Port_Cutout',
  ]

  readonly name = 'CME Globex Livestock'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [8, 30] }]],
    ['market_close', [{ from: null, value: [13, 5] }]],
  ])

  override regularHolidays = AGRICULTURE_HOLIDAYS
  override adhocHolidays = [...us.USNationalDaysofMourning]

  override specialTimes: Closes = {
    market_close: [
      closesAt(
        [12, 5],
        [
          us.USBlackFridayInOrAfter1993,
          us.ChristmasEveBefore1993,
          us.ChristmasEveInOrAfter1993,
        ],
      ),
    ],
  }
}

/**
 * CME Globex grains and oilseeds futures.
 *
 * These break in the morning, between the overnight session that opens at
 * 19:00 the evening before and the day session.
 */
export class CMEGlobexGrains extends MarketCalendar {
  static override aliases = ['CMEGlobex_Grains', 'CMEGlobex_Oilseeds']

  readonly name = 'CME Globex Grains'
  readonly tz = 'America/Chicago'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [19, 0, -1] }]],
    ['break_start', [{ from: null, value: [7, 45] }]],
    ['break_end', [{ from: null, value: [8, 30] }]],
    ['market_close', [{ from: null, value: [13, 20] }]],
  ])

  override regularHolidays = AGRICULTURE_HOLIDAYS
}
