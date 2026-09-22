import { DateTime } from 'luxon'
import {
  MarketCalendar,
  MarketTimeKey,
  TimeOfDay,
} from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Weekday } from '../utils/constants'
import { Dated } from '../utils/dated'
import * as us from '../holidays/us'
import {
  ChristmasEvePost1999Early1pmClose,
  FridayAfterIndependenceDayNYSEpre2013,
  NYSEEarlyCloses,
  NYSEEarlyClose1pmDates,
  NYSELateOpens,
  NYSESaturdayClosings,
} from '../holidays/nyse'

/**
 * New York Stock Exchange.
 *
 * Regular hours are 09:30–16:00 Eastern today, with a 04:00 pre-market and a
 * 20:00 post-market session, and the class records the earlier eras
 * too: the open moved from 10:00 in 1985, the close from 15:00 to 15:30 in 1952
 * and to 16:00 in 1974, and Saturday trading ran until 1952-09-29 with a noon
 * close. Full-day closures come from the dated US rules in `holidays/us`, so
 * historical rule changes (MLK from 1998, Juneteenth from 2022, the
 * Washington's Birthday to Presidents' Day switch) are honoured by the rules
 * themselves rather than by this class.
 *
 * Scope: the recurring rules plus the well-known adhoc closures. The dozens of
 * one-off historical early closes in the reference implementation (weather,
 * funerals, backlog half-days) are not modelled.
 *
 * Special closes run from 11:00 to 15:56 and late opens from 09:31 to 13:00,
 * almost all of them one-off events — a funeral, a snowstorm, a power failure,
 * the paperwork backlogs of 1967 to 1970. Only a handful are recurring rules.
 */
export class NYSE extends MarketCalendar {
  static override aliases = [
    'XNYS',
    'NYSE',
    'stock',
    'NASDAQ',
    'BATS',
    'DJIA',
    'DOW',
  ]

  readonly name = 'NYSE'
  readonly tz = 'America/New_York'

  /** The last date Saturday sessions were held. */
  private static readonly SATURDAY_END = '1952-09-29'

  /** Saturday sessions closed at noon rather than the regular close. */
  private static readonly SATURDAY_CLOSE: TimeOfDay = [12, 0]

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay>[]>([
    ['pre', [{ from: null, value: [4, 0] }]],
    [
      'market_open',
      [
        { from: null, value: [10, 0] },
        { from: '1985-01-01', value: [9, 30] },
      ],
    ],
    [
      'market_close',
      [
        { from: null, value: [15, 0] },
        { from: '1952-09-29', value: [15, 30] },
        { from: '1974-01-01', value: [16, 0] },
      ],
    ],
    ['post', [{ from: null, value: [20, 0] }]],
  ])

  override weekmask: Dated<Weekday[]>[] = [
    {
      from: null,
      value: [
        Weekday.MONDAY,
        Weekday.TUESDAY,
        Weekday.WEDNESDAY,
        Weekday.THURSDAY,
        Weekday.FRIDAY,
        Weekday.SATURDAY,
      ],
    },
    {
      from: NYSE.SATURDAY_END,
      value: [
        Weekday.MONDAY,
        Weekday.TUESDAY,
        Weekday.WEDNESDAY,
        Weekday.THURSDAY,
        Weekday.FRIDAY,
      ],
    },
  ]

  override regularHolidays = new HolidayCalendar([
    us.USNewYearsDay,
    us.USMartinLutherKingJrAfter1998,
    us.USLincolnsBirthDayBefore1954,
    us.USWashingtonsBirthDayBefore1964,
    us.USWashingtonsBirthDay1964to1970,
    us.USPresidentsDay,
    us.GoodFriday,
    us.USMemorialDayBefore1964,
    us.USMemorialDay1964to1969,
    us.USMemorialDay,
    us.USJuneteenthAfter2022,
    us.USIndependenceDayBefore1954,
    us.USIndependenceDay,
    us.USLaborDay,
    us.USColumbusDayBefore1954,
    us.USElectionDay1848to1967,
    us.USElectionDay1968to1980,
    us.USVeteransDay1934to1953,
    us.USThanksgivingDayBefore1939,
    us.USThanksgivingDay1939to1941,
    us.USThanksgivingDay,
    us.ChristmasBefore1954,
    us.Christmas,
    us.BattleOfGettysburg,
  ])

  override adhocHolidays = [
    ...us.November29BacklogRelief,
    ...us.March33BankHoliday,
    ...us.August45VictoryOverJapan,
    ...us.ChristmasEvesAdhoc,
    ...us.DayAfterChristmasAdhoc,
    ...us.DayBeforeDecorationAdhoc,
    ...us.LincolnsBirthDayAdhoc,
    ...us.PaperworkCrisis68,
    ...us.DayAfterIndependenceDayAdhoc,
    ...us.WeatherSnowClosing,
    ...us.FirstLunarLandingClosing,
    ...us.NewYorkCityBlackout77,
    ...us.HurricaneGloriaClosings,
    ...us.HurricaneSandyClosings,
    ...us.September11Closings,
    ...us.USNationalDaysofMourning,
    ...NYSESaturdayClosings,
  ]

  /**
   * The rules behind the 13:00 half-days. The post session on those days ends
   * at 17:00 rather than 20:00, so both read from one calendar.
   */
  private static readonly CLOSE_1PM_RULES = new HolidayCalendar([
    FridayAfterIndependenceDayNYSEpre2013,
    us.MonTuesThursBeforeIndependenceDay,
    us.WednesdayBeforeIndependenceDayPost2013,
    us.USBlackFridayInOrAfter1993,
    ChristmasEvePost1999Early1pmClose,
  ])

  /** The rule behind the 14:00 half-days. */
  private static readonly CLOSE_2PM_RULES = new HolidayCalendar([
    us.USBlackFridayBefore1993,
  ])

  override specialTimes = {
    market_open: NYSELateOpens.map(({ time, dates }) => ({
      time: time as TimeOfDay,
      adhocDates: dates,
    })),
    market_close: NYSEEarlyCloses.map(({ time, dates }) => ({
      time: time as TimeOfDay,
      adhocDates: dates,
      calendar:
        time[0] === 13 && time[1] === 0
          ? NYSE.CLOSE_1PM_RULES
          : time[0] === 14 && time[1] === 0
            ? NYSE.CLOSE_2PM_RULES
            : undefined,
    })),
    post: [
      {
        time: [17, 0] as TimeOfDay,
        calendar: NYSE.CLOSE_1PM_RULES,
        adhocDates: NYSEEarlyClose1pmDates,
      },
    ],
  }

  /**
   * The Saturday sessions NYSE ran until 1952 closed at noon, whatever the
   * regular close of the day was.
   */
  protected override timeOn(
    key: MarketTimeKey,
    date: DateTime,
  ): TimeOfDay | undefined {
    if (key === 'market_close' && date.weekday === Weekday.SATURDAY) {
      return NYSE.SATURDAY_CLOSE
    }
    return super.timeOn(key, date)
  }
}
