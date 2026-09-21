import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import { USNewYearsDay } from '../holidays/us'
import { autumnalCitizenDates } from '../holidays/jpxEquinox'
import * as jp from '../holidays/jp'

/**
 * Japan Exchange Group.
 *
 * The first exchange here with a lunch break in earnest: trading stops at
 * 11:30 and resumes at 12:30. The close moved from 15:00 to 15:30 on
 * 2024-11-05.
 *
 * Not modelled: the Saturday sessions the Tokyo exchange ran until 1984,
 * which the reference implementation does not model either.
 */
export class JPX extends MarketCalendar {
  static override aliases = ['JPX', 'XJPX']

  readonly name = 'JPX'
  readonly tz = 'Asia/Tokyo'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [9, 0] }]],
    ['break_start', [{ from: null, value: [11, 30] }]],
    ['break_end', [{ from: null, value: [12, 30] }]],
    [
      'market_close',
      [
        { from: null, value: [15, 0] },
        { from: '2024-11-05', value: [15, 30] },
      ],
    ],
  ])

  override regularHolidays = new HolidayCalendar([
    USNewYearsDay,
    jp.JapanNewYearsDay2,
    jp.JapanNewYearsDay3,
    jp.JapanComingOfAgeDay1951To1973,
    jp.JapanComingOfAgeDay1974To1999,
    jp.JapanComingOfAgeDay,
    jp.JapanNationalFoundationDay1969To1973,
    jp.JapanNationalFoundationDay,
    jp.JapanEmperorsBirthday,
    jp.JapanVernalEquinox,
    jp.JapanShowaDayUntil1972,
    jp.JapanShowaDay,
    jp.JapanConstitutionMemorialDayUntil1972,
    jp.JapanConstitutionMemorialDay,
    jp.JapanGreeneryDay,
    jp.JapanChildrensDayUntil1972,
    jp.JapanChildrensDay,
    jp.JapanGoldenWeekBonusDay,
    jp.JapanMarineDay1996To2002,
    jp.JapanMarineDay2003To2019,
    jp.JapanMarineDay2020,
    jp.JapanMarineDay2021,
    jp.JapanMarineDay,
    jp.JapanMountainDay2016to2019,
    jp.JapanMountainDay2020,
    jp.JapanMountainDay2021,
    jp.JapanMountainDay2021NextDay,
    jp.JapanMountainDay,
    jp.JapanRespectForTheAgedDay1966To1972,
    jp.JapanRespectForTheAgedDay1973To2002,
    jp.JapanRespectForTheAgedDay,
    jp.JapanAutumnalEquinox,
    jp.JapanHealthAndSportsDay1966To1972,
    jp.JapanHealthAndSportsDay1973To1999,
    jp.JapanHealthAndSportsDay2000To2019,
    jp.JapanSportsDay2020,
    jp.JapanSportsDay2021,
    jp.JapanSportsDay,
    jp.JapanCultureDayUntil1972,
    jp.JapanCultureDay,
    jp.JapanLaborThanksgivingDayUntil1972,
    jp.JapanLaborThanksgivingDay,
    jp.JapanEmperorAkahitosBirthday,
    jp.JapanDecember29Until1988,
    jp.JapanDecember30Until1988,
    jp.JapanBeforeNewYearsDay,
  ])

  override adhocHolidays = [
    ...jp.AscensionDays,
    ...jp.MarriageDays,
    ...jp.FuneralShowa,
    ...jp.EnthronementDays,
    ...autumnalCitizenDates(),
    ...jp.NoN225IndexPrices,
    ...jp.EquityTradingSystemFailure,
  ]
}
