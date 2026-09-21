import { DateTime } from 'luxon'
import { Holiday } from '../core/Holiday'
import { sundayToMonday, weekdayOffset } from '../utils/rules'
import { Weekday } from '../utils/constants'
import { autumnalEquinox, vernalEquinox } from './jpxEquinox'

/**
 * Japanese public holidays, as the Tokyo exchange observes them.
 *
 * Many are stated several times over, once per era: the country moved a
 * number of its holidays to Mondays around 2000 and shuffled several more
 * for the 2020 Olympics. Ported from the reference implementation's
 * `holidays/jp.py`, whose weekday numbering starts at Monday = 0 where
 * Luxon's starts at 1.
 */

/** Read a list of ISO dates as UTC dates. */
const dates = (iso: string[]): DateTime[] =>
  iso.map((d) => DateTime.fromISO(d, { zone: 'utc' }))

/** AscensionDays. */
export const AscensionDays = dates(['2019-04-30', '2019-05-01', '2019-05-02'])

/** MarriageDays. */
export const MarriageDays = dates(['1959-04-10', '1993-06-09'])

/** FuneralShowa. */
export const FuneralShowa = dates(['1989-02-24'])

/** EnthronementDays. */
export const EnthronementDays = dates(['1990-11-12', '2019-10-22'])

/** NoN225IndexPrices. */
export const NoN225IndexPrices = dates([
  '1951-02-15',
  '1953-02-09',
  '1954-10-26',
  '1959-04-10',
])

/** EquityTradingSystemFailure. */
export const EquityTradingSystemFailure = dates(['2020-10-01'])

export const JapanNewYearsDay2 = new Holiday({
  name: "New Year's Day",
  month: 1,
  day: 2,
  observance: sundayToMonday,
})

export const JapanNewYearsDay3 = new Holiday({
  name: "New Year's Day",
  month: 1,
  day: 3,
})

export const JapanComingOfAgeDay1951To1973 = new Holiday({
  name: 'Coming of Age Day',
  month: 1,
  day: 15,
  startDate: DateTime.utc(1951, 1, 1),
  endDate: DateTime.utc(1973, 12, 31),
})

export const JapanComingOfAgeDay1974To1999 = new Holiday({
  name: 'Coming of Age Day',
  month: 1,
  day: 15,
  startDate: DateTime.utc(1974, 1, 1),
  endDate: DateTime.utc(1999, 12, 31),
  observance: sundayToMonday,
})

/** second monday of january */
export const JapanComingOfAgeDay = new Holiday({
  name: 'Coming of Age Day',
  month: 1,
  day: 1,
  startDate: DateTime.utc(2000, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 2),
})

/** also held 1872 to 1948 as Kigen-setsu */
export const JapanNationalFoundationDay1969To1973 = new Holiday({
  name: 'National Foundation Day',
  month: 2,
  day: 11,
  startDate: DateTime.utc(1969, 1, 1),
  endDate: DateTime.utc(1973, 12, 31),
})

export const JapanNationalFoundationDay = new Holiday({
  name: 'National Foundation Day',
  month: 2,
  day: 11,
  startDate: DateTime.utc(1974, 1, 1),
  observance: sundayToMonday,
})

export const JapanEmperorsBirthday = new Holiday({
  name: "The Emperor's Birthday",
  month: 2,
  day: 23,
  startDate: DateTime.utc(2020, 1, 1),
  observance: sundayToMonday,
})

export const JapanVernalEquinox = new Holiday({
  name: 'Vernal Equinox',
  month: 3,
  day: 20,
  observance: vernalEquinox,
})

/** 1965 */
export const JapanShowaDayUntil1972 = new Holiday({
  name: 'Showa Day',
  month: 4,
  day: 29,
  endDate: DateTime.utc(1972, 12, 31),
})

export const JapanShowaDay = new Holiday({
  name: 'Showa Day',
  month: 4,
  day: 29,
  startDate: DateTime.utc(1973, 1, 1),
  observance: sundayToMonday,
})

export const JapanConstitutionMemorialDayUntil1972 = new Holiday({
  name: 'Constitution Memorial Day',
  month: 5,
  day: 3,
  startDate: DateTime.utc(1948, 1, 1),
  endDate: DateTime.utc(1972, 12, 31),
})

export const JapanConstitutionMemorialDay = new Holiday({
  name: 'Constitution Memorial Day',
  month: 5,
  day: 3,
  startDate: DateTime.utc(1973, 1, 1),
  observance: sundayToMonday,
})

/** prior to 1985 was a Citizen's Day */
export const JapanGreeneryDay = new Holiday({
  name: 'Greenery Day',
  month: 5,
  day: 4,
  startDate: DateTime.utc(1985, 1, 1),
  observance: sundayToMonday,
})

export const JapanChildrensDayUntil1972 = new Holiday({
  name: "Children's Day",
  month: 5,
  day: 5,
  startDate: DateTime.utc(1948, 1, 1),
  endDate: DateTime.utc(1972, 12, 31),
})

export const JapanChildrensDay = new Holiday({
  name: "Children's Day",
  month: 5,
  day: 5,
  startDate: DateTime.utc(1973, 1, 1),
  observance: sundayToMonday,
})

export const JapanGoldenWeekBonusDay = new Holiday({
  name: 'Golden Week Bonus Day',
  month: 5,
  day: 6,
  startDate: DateTime.utc(2007, 1, 1),
  daysOfWeek: [Weekday.TUESDAY, Weekday.WEDNESDAY],
})

export const JapanMarineDay1996To2002 = new Holiday({
  name: 'Marine Day',
  month: 7,
  day: 20,
  startDate: DateTime.utc(1996, 1, 1),
  endDate: DateTime.utc(2002, 12, 31),
  observance: sundayToMonday,
})

export const JapanMarineDay2003To2019 = new Holiday({
  name: 'Marine Day',
  month: 7,
  day: 1,
  startDate: DateTime.utc(2003, 1, 1),
  endDate: DateTime.utc(2019, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

/** shift for Olympics */
export const JapanMarineDay2020 = new Holiday({
  name: 'Marine Day',
  month: 7,
  day: 23,
  startDate: DateTime.utc(2020, 1, 1),
  endDate: DateTime.utc(2020, 12, 31),
})

/** shift for Olympics (Olympics and Paralympics postponed until 2021 due to the COVID-19 pandemic) */
export const JapanMarineDay2021 = new Holiday({
  name: 'Marine Day',
  month: 7,
  day: 22,
  startDate: DateTime.utc(2021, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
})

export const JapanMarineDay = new Holiday({
  name: 'Marine Day',
  month: 7,
  day: 1,
  startDate: DateTime.utc(2022, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const JapanMountainDay2016to2019 = new Holiday({
  name: 'Mountain Day',
  month: 8,
  day: 11,
  startDate: DateTime.utc(2016, 1, 1),
  endDate: DateTime.utc(2019, 12, 31),
  observance: sundayToMonday,
})

/** shift for Olympics */
export const JapanMountainDay2020 = new Holiday({
  name: 'Mountain Day',
  month: 8,
  day: 10,
  startDate: DateTime.utc(2020, 1, 1),
  endDate: DateTime.utc(2020, 12, 31),
})

/** shift for Olympics (Olympics and Paralympics postponed until 2021 due to the COVID-19 pandemic) */
export const JapanMountainDay2021 = new Holiday({
  name: 'Mountain Day',
  month: 8,
  day: 8,
  startDate: DateTime.utc(2021, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
})

/** shift for Olympics (Olympics and Paralympics postponed until 2021 due to the COVID-19 pandemic) */
export const JapanMountainDay2021NextDay = new Holiday({
  name: 'Mountain Day',
  month: 8,
  day: 9,
  startDate: DateTime.utc(2021, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
})

export const JapanMountainDay = new Holiday({
  name: 'Mountain Day',
  month: 8,
  day: 11,
  startDate: DateTime.utc(2022, 1, 1),
  observance: sundayToMonday,
})

export const JapanRespectForTheAgedDay1966To1972 = new Holiday({
  name: 'Respect for the Aged Day',
  month: 9,
  day: 15,
  startDate: DateTime.utc(1966, 1, 1),
  endDate: DateTime.utc(1972, 12, 31),
})

export const JapanRespectForTheAgedDay1973To2002 = new Holiday({
  name: 'Respect for the Aged Day',
  month: 9,
  day: 15,
  startDate: DateTime.utc(1973, 1, 1),
  endDate: DateTime.utc(2002, 12, 31),
  observance: sundayToMonday,
})

export const JapanRespectForTheAgedDay = new Holiday({
  name: 'Respect for the Aged Day',
  month: 9,
  day: 1,
  startDate: DateTime.utc(2003, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const JapanAutumnalEquinox = new Holiday({
  name: 'Autumnal Equinox',
  month: 9,
  day: 22,
  observance: autumnalEquinox,
})

export const JapanHealthAndSportsDay1966To1972 = new Holiday({
  name: 'Health and Sports Day',
  month: 10,
  day: 10,
  startDate: DateTime.utc(1966, 1, 1),
  endDate: DateTime.utc(1972, 12, 31),
})

export const JapanHealthAndSportsDay1973To1999 = new Holiday({
  name: 'Health and Sports Day',
  month: 10,
  day: 10,
  startDate: DateTime.utc(1973, 1, 1),
  endDate: DateTime.utc(1999, 12, 31),
  observance: sundayToMonday,
})

export const JapanHealthAndSportsDay2000To2019 = new Holiday({
  name: 'Health and Sports Day',
  month: 10,
  day: 1,
  startDate: DateTime.utc(2000, 1, 1),
  endDate: DateTime.utc(2019, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 2),
})

/** shift for Olympics */
export const JapanSportsDay2020 = new Holiday({
  name: 'Sports Day',
  month: 7,
  day: 24,
  startDate: DateTime.utc(2020, 1, 1),
  endDate: DateTime.utc(2020, 12, 31),
})

/** shift for Olympics (Olympics and Paralympics postponed until 2021 due to the COVID-19 pandemic) */
export const JapanSportsDay2021 = new Holiday({
  name: 'Sports Day',
  month: 7,
  day: 23,
  startDate: DateTime.utc(2021, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
})

export const JapanSportsDay = new Holiday({
  name: 'Sports Day',
  month: 10,
  day: 1,
  startDate: DateTime.utc(2022, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 2),
})

/** prior to 1948 Emperor Meiji's Birthday */
export const JapanCultureDayUntil1972 = new Holiday({
  name: 'Culture Day',
  month: 11,
  day: 3,
  startDate: DateTime.utc(1948, 1, 1),
  endDate: DateTime.utc(1972, 12, 31),
})

export const JapanCultureDay = new Holiday({
  name: 'Culture Day',
  month: 11,
  day: 3,
  startDate: DateTime.utc(1973, 1, 1),
  observance: sundayToMonday,
})

/** prior to 1948 harvest festival Niiname-sai */
export const JapanLaborThanksgivingDayUntil1972 = new Holiday({
  name: 'Labor Thanksgiving Day',
  month: 11,
  day: 23,
  endDate: DateTime.utc(1972, 12, 31),
})

export const JapanLaborThanksgivingDay = new Holiday({
  name: 'Labor Thanksgiving Day',
  month: 11,
  day: 23,
  startDate: DateTime.utc(1973, 1, 1),
  observance: sundayToMonday,
})

export const JapanEmperorAkahitosBirthday = new Holiday({
  name: "Emperor Akahito's Birthday",
  month: 12,
  day: 23,
  startDate: DateTime.utc(1990, 1, 1),
  endDate: DateTime.utc(2018, 12, 31),
  observance: sundayToMonday,
})

export const JapanDecember29Until1988 = new Holiday({
  name: 'Closed Decenber 29',
  month: 12,
  day: 29,
  endDate: DateTime.utc(1988, 12, 31),
})

export const JapanDecember30Until1988 = new Holiday({
  name: 'Closed December 30',
  month: 12,
  day: 30,
  endDate: DateTime.utc(1988, 12, 31),
})

/** prior to 1948 harvest festival Niname-sai */
export const JapanBeforeNewYearsDay = new Holiday({
  name: "Before New Year's Day",
  month: 12,
  day: 31,
  observance: sundayToMonday,
})
