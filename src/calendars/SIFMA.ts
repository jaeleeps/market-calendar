import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import * as sifma from '../holidays/sifma'
import * as jp from '../holidays/jp'

const times = (open: TimeOfDay, close: TimeOfDay) =>
  new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: open }]],
    ['market_close', [{ from: null, value: close }]],
  ])

/** The one-off UK closures both non-US desks observe. */
const UK_ADHOC = [...sifma.UKSpringBankAdHoc, ...sifma.UKPlatinumJubilee2022]

/**
 * SIFMA's recommended US bond market hours.
 *
 * Unlike the equity calendars this keeps Columbus Day and Veterans Day, and
 * closes at 14:00 on the days either side of a holiday rather than 13:00.
 *
 * Good Friday is a full closure only through 2020. After that SIFMA decides
 * year by year, depending on whether employment figures are released, so the
 * reference implementation leaves it out and so does this.
 */
export class SIFMAUS extends MarketCalendar {
  static override aliases = [
    'SIFMAUS',
    'SIFMA_US',
    'Capital_Markets_US',
    'Financial_Markets_US',
    'Bond_Markets_US',
  ]

  readonly name = 'SIFMA_US'
  readonly tz = 'America/New_York'

  override regularMarketTimes = times([7, 0], [17, 30])

  override regularHolidays = new HolidayCalendar([
    sifma.USNewYearsDay,
    sifma.MartinLutherKingJr,
    sifma.USPresidentsDay,
    sifma.GoodFridayThru2020,
    sifma.USMemorialDay,
    sifma.USJuneteenthAfter2022,
    sifma.USIndependenceDay,
    sifma.USLaborDay,
    sifma.USColumbusDay,
    sifma.USVeteransDay,
    sifma.USThanksgivingDay,
    sifma.Christmas,
  ])

  override specialTimes = {
    market_close: [
      {
        time: [14, 0] as TimeOfDay,
        calendar: new HolidayCalendar([
          sifma.DayBeforeGoodFriday2pmEarlyCloseThru2020,
          sifma.DayBeforeUSMemorialDay2pmEarlyClose,
          sifma.DayBeforeUSIndependenceDay2pmEarlyClose,
          sifma.ThursdayBeforeUSIndependenceDay2pmEarlyClose,
          sifma.DayAfterThanksgiving2pmEarlyClose,
          sifma.ChristmasEve2pmEarlyClose,
          sifma.ChristmasEveThursday2pmEarlyClose,
          sifma.USNewYearsEve2pmEarlyClose,
        ]),
      },
    ],
  }
}

/**
 * SIFMA's recommended UK bond market hours.
 *
 * A London desk trading US paper, so it keeps both sets of holidays: UK bank
 * holidays alongside Martin Luther King Day, Memorial Day and Thanksgiving.
 */
export class SIFMAUK extends MarketCalendar {
  static override aliases = [
    'SIFMAUK',
    'SIFMA_UK',
    'Capital_Markets_UK',
    'Financial_Markets_UK',
    'Bond_Markets_UK',
  ]

  readonly name = 'SIFMA_UK'
  readonly tz = 'Europe/London'

  override regularMarketTimes = times([8, 0], [17, 0])

  override regularHolidays = new HolidayCalendar([
    sifma.UKNewYearsDay,
    sifma.MartinLutherKingJr,
    sifma.USPresidentsDay,
    sifma.UKGoodFriday,
    sifma.UKEasterMonday,
    sifma.UKMayDay,
    sifma.USMemorialDay,
    sifma.USJuneteenthAfter2022,
    sifma.USIndependenceDay,
    sifma.UKSummerBank,
    sifma.USLaborDay,
    sifma.USColumbusDay,
    sifma.USVeteransDay,
    sifma.USThanksgivingDay,
    sifma.FridayChristmasEve,
    sifma.UKChristmas,
    sifma.UKWeekendChristmas,
    sifma.UKBoxingDay,
    sifma.UKWeekendBoxingDay,
  ])

  override adhocHolidays = UK_ADHOC
}

/**
 * SIFMA's recommended Japanese bond market hours.
 *
 * The longest holiday list here by some way: Japanese public holidays, the
 * UK ones around Easter and Christmas, and the US ones in between.
 */
export class SIFMAJP extends MarketCalendar {
  static override aliases = [
    'SIFMAJP',
    'SIFMA_JP',
    'Capital_Markets_JP',
    'Financial_Markets_JP',
    'Bond_Markets_JP',
  ]

  readonly name = 'SIFMA_JP'
  readonly tz = 'Asia/Tokyo'

  override regularMarketTimes = times([8, 30], [18, 30])

  override regularHolidays = new HolidayCalendar([
    sifma.UKNewYearsDay,
    jp.JapanComingOfAgeDay,
    sifma.MartinLutherKingJr,
    jp.JapanNationalFoundationDay,
    sifma.USPresidentsDay,
    jp.JapanEmperorsBirthday,
    jp.JapanVernalEquinox,
    sifma.UKGoodFriday,
    sifma.UKEasterMonday,
    jp.JapanShowaDay,
    jp.JapanConstitutionMemorialDay,
    jp.JapanGreeneryDay,
    jp.JapanChildrensDay,
    sifma.USMemorialDay,
    sifma.USJuneteenthAfter2022,
    sifma.USIndependenceDay,
    jp.JapanMarineDay,
    jp.JapanMountainDay,
    sifma.UKSummerBank,
    sifma.USLaborDay,
    jp.JapanRespectForTheAgedDay,
    jp.JapanAutumnalEquinox,
    jp.JapanSportsDay,
    jp.JapanSportsDay2020,
    jp.JapanHealthAndSportsDay2000To2019,
    jp.JapanCultureDay,
    sifma.USVeteransDay,
    jp.JapanLaborThanksgivingDay,
    sifma.USThanksgivingDay,
    sifma.FridayChristmasEve,
    sifma.UKChristmas,
    sifma.UKBoxingDay,
    sifma.UKWeekendBoxingDay,
  ])

  override adhocHolidays = UK_ADHOC
}
