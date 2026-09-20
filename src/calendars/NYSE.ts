import { DateTime } from 'luxon'
import { MarketCalendar } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import * as us from '../holidays/us'

/**
 * New York Stock Exchange.
 *
 * Regular hours are 09:30–16:00 Eastern. Full-day closures come from the dated
 * US rules in `holidays/us`, so historical rule changes (MLK from 1998,
 * Juneteenth from 2022, the Washington's Birthday to Presidents' Day switch)
 * are honoured by the rules themselves rather than by this class.
 *
 * Scope: the recurring rules plus the well-known adhoc closures. The dozens of
 * one-off historical early closes in the reference implementation (weather,
 * funerals, backlog half-days) are not modelled.
 */
export class NYSE extends MarketCalendar {
  static override aliases = ['XNYS', 'NYSE', 'stock']

  readonly name = 'NYSE'
  readonly tz = 'America/New_York'

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
  ]

  override specialCloses = [
    {
      time: [14, 0] as [number, number],
      calendar: new HolidayCalendar([
        us.ChristmasEveBefore1993,
        us.USBlackFridayBefore1993,
      ]),
    },
    {
      time: [13, 0] as [number, number],
      calendar: new HolidayCalendar([
        us.ChristmasEveInOrAfter1993,
        us.USBlackFridayInOrAfter1993,
        us.MonTuesThursBeforeIndependenceDay,
        us.FridayAfterIndependenceDayPre2013,
        us.WednesdayBeforeIndependenceDayPost2013,
      ]),
    },
  ]
}
