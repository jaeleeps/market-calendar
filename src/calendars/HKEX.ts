import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import * as hk from '../holidays/hk'
import { GoodFriday } from '../holidays/us'
import { EasterMonday } from '../holidays/uk'

/**
 * Hong Kong Exchanges and Clearing.
 *
 * Breaks for lunch between noon and one. Most of its holidays follow the
 * lunar calendar, and the Spring and Mid-Autumn festivals are each stated
 * three times over: the rules changed in 1983 and again in 2010.
 */
export class HKEX extends MarketCalendar {
  static override aliases = ['HKEX', 'XHKG']

  readonly name = 'HKEX'
  override get fullName(): string {
    return 'Hong Kong Stock Exchange'
  }
  readonly tz = 'Asia/Hong_Kong'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [9, 30] }]],
    ['break_start', [{ from: null, value: [12, 0] }]],
    ['break_end', [{ from: null, value: [13, 0] }]],
    ['market_close', [{ from: null, value: [16, 0] }]],
  ])

  override regularHolidays = new HolidayCalendar([
    hk.HKNewYearsDay,
    hk.SpringFestivalDayBefore1983,
    hk.SpringFestivalDay2Before1983,
    hk.SpringFestivalDay3Before1983,
    hk.SpringFestivalDayBefore2010,
    hk.SpringFestivalDay2Before2010,
    hk.SpringFestivalDay3Before2010,
    hk.SpringFestivalDay,
    hk.SpringFestivalDay2,
    hk.SpringFestivalDay3,
    GoodFriday,
    EasterMonday,
    hk.TombSweepingDay,
    hk.LabourDay,
    hk.BuddhaShakyamuniDay,
    hk.DragonBoatFestivalDay,
    hk.HKRegionEstablishmentDay,
    hk.MidAutumnFestivalDayBefore1983,
    hk.MidAutumnFestivalDayBefore2010,
    hk.MidAutumnFestivalDay,
    hk.DoubleNinthFestivalDay,
    hk.NationalDay,
    hk.Christmas,
    hk.BoxingDay,
    hk.QueenBirthday,
    hk.QueenBirthday2,
    hk.CommemoratingAlliedVictory,
    hk.IDontKnow,
  ])

  override adhocHolidays = hk.HKClosedDay
}
