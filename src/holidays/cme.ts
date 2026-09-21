import { DateTime } from 'luxon'
import { Holiday } from '../core/Holiday'
import {
  easterOffset,
  easterSunday,
  goodFridayObservance,
  nearestWorkday,
  plusOneDay,
  weekdayOffset,
} from '../utils/rules'
import { Weekday } from '../utils/constants'

/**
 * Holidays of the CME exchanges.
 *
 * Good Friday is the awkward one: CME has closed on some and traded a
 * shortened session on others, and which is which has to be stated year by
 * year. Ported from the reference implementation's `holidays/cme.py`.
 */

/** Read a list of ISO dates as UTC dates. */
const dates = (iso: string[]): DateTime[] =>
  iso.map((d) => DateTime.fromISO(d, { zone: 'utc' }))

/** Good Friday in a single year, as a rule bounded to that year. */
const goodFridayIn = (year: number): Holiday =>
  new Holiday({
    name: `Good Friday ${year}`,
    month: 1,
    day: 1,
    observance: goodFridayObservance,
    startDate: DateTime.utc(year, 1, 1),
    endDate: DateTime.utc(year, 12, 31),
  })

/** The years CME traded a shortened session on Good Friday rather than closing. */
export const CME_EQUITY_GOOD_FRIDAY_EARLY_CLOSE_YEARS = [2010, 2012, 2015, 2021]

/** Good Friday from 2023, when the shortened session became the rule. */
export const GoodFridayAfter2022 = new Holiday({
  name: 'Good Friday from 2023',
  month: 1,
  day: 1,
  observance: goodFridayObservance,
  startDate: DateTime.utc(2023, 1, 1),
})

/** The individual Good Fridays CME traded short before that. */
export const GoodFridayEarlyCloseYears =
  CME_EQUITY_GOOD_FRIDAY_EARLY_CLOSE_YEARS.map(goodFridayIn)

/** Good Friday in 2022, which CME closed for. */
export const GoodFriday2022 = goodFridayIn(2022)

/**
 * The Good Fridays CME closed for up to 2020.
 *
 * 2010, 2012 and 2015 are left out: the exchange traded a shortened session
 * on those, so the observance declines them.
 */
export const GoodFridayBefore2021NotEarlyClose = new Holiday({
  name: 'Good Friday closed before 2021',
  month: 1,
  day: 1,
  observance: (dt) =>
    [2010, 2012, 2015].includes(dt.year) ? null : goodFridayObservance(dt),
  endDate: DateTime.utc(2020, 12, 31),
})

/**
 * The day before Independence Day, when the fourth falls Tuesday to Friday.
 *
 * Other years have no early close, which the observance declines.
 */
export const USIndependenceDayBefore2022PreviousDay = new Holiday({
  name: 'Day before July 4th',
  month: 7,
  day: 4,
  startDate: DateTime.utc(1954, 1, 1),
  observance: (dt) => {
    const fourth = DateTime.utc(dt.year, 7, 4)
    return fourth.weekday >= Weekday.TUESDAY && fourth.weekday <= Weekday.FRIDAY
      ? fourth.minus({ days: 1 })
      : null
  },
})

/** Good Fridays the bond markets closed for. */
export const BondsGoodFridayClosed = dates([
  '1970-03-27',
  '1971-04-09',
  '1972-03-31',
  '1973-04-20',
  '1974-04-12',
  '1975-03-28',
  '1976-04-16',
  '1977-04-08',
  '1978-03-24',
  '1979-04-13',
  '1981-04-17',
  '1982-04-09',
  '1984-04-20',
  '1986-03-28',
  '1987-04-17',
  '1989-03-24',
  '1990-04-13',
  '1991-03-29',
  '1992-04-17',
  '1993-04-09',
  '1995-04-14',
  '1997-03-28',
  '1998-04-10',
  '2000-04-21',
  '2001-04-13',
  '2002-03-29',
  '2003-04-18',
  '2004-04-09',
  '2005-03-25',
  '2006-04-14',
  '2008-03-21',
  '2009-04-10',
  '2011-04-22',
  '2013-03-29',
  '2014-04-18',
  '2016-03-25',
  '2017-04-14',
  '2018-03-30',
  '2019-04-19',
  '2020-04-10',
  '2022-04-15',
  '2024-03-29',
  '2025-04-18',
  '2027-03-26',
  '2028-04-14',
  '2029-03-30',
  '2030-04-19',
  '2031-04-11',
  '2032-03-26',
  '2033-04-15',
  '2035-03-23',
  '2036-04-11',
  '2038-04-23',
  '2039-04-08',
  '2040-03-30',
  '2041-04-19',
  '2043-03-27',
  '2044-04-15',
  '2046-03-23',
  '2047-04-12',
  '2049-04-16',
  '2050-04-08',
  '2051-03-31',
  '2052-04-19',
  '2054-03-27',
  '2055-04-16',
  '2056-03-31',
  '2057-04-20',
  '2058-04-12',
  '2059-03-28',
  '2060-04-16',
  '2061-04-08',
  '2062-03-24',
  '2063-04-13',
  '2065-03-27',
  '2066-04-09',
  '2068-04-20',
  '2069-04-12',
  '2070-03-28',
  '2071-04-17',
  '2072-04-08',
  '2073-03-24',
  '2074-04-13',
  '2076-04-17',
  '2077-04-09',
  '2079-04-21',
  '2081-03-28',
  '2082-04-17',
  '2084-03-24',
  '2085-04-13',
  '2086-03-29',
  '2087-04-18',
  '2088-04-09',
  '2090-04-14',
  '2092-03-28',
  '2093-04-10',
  '2095-04-22',
  '2096-04-13',
  '2097-03-29',
  '2098-04-18',
  '2099-04-10',
])

/** Good Fridays the bond markets traded, closing at 10:00. */
export const BondsGoodFridayOpen = dates([
  '1980-04-04',
  '1983-04-01',
  '1985-04-05',
  '1988-04-01',
  '1994-04-01',
  '1996-04-05',
  '1999-04-02',
  '2007-04-06',
  '2010-04-02',
  '2012-04-06',
  '2015-04-03',
  '2021-04-02',
  '2023-04-07',
  '2026-04-03',
  '2034-04-07',
  '2037-04-03',
  '2042-04-04',
  '2045-04-07',
  '2048-04-03',
  '2053-04-04',
  '2064-04-04',
  '2067-04-01',
  '2075-04-05',
  '2078-04-01',
  '2080-04-05',
  '2083-04-02',
  '2089-04-01',
  '2091-04-06',
  '2094-04-02',
])

/** Easter is re-exported so a calendar can state its own Good Friday rules. */
export { easterSunday }

/**
 * The era-bounded US holidays the CME products observe.
 *
 * Each of these is an ordinary US holiday that CME treated differently before
 * and after some date — it stopped trading through Memorial Day in 2013, for
 * instance — so the same holiday appears twice with the eras marked. Which
 * of the pair a product uses, and at what time it closes, is the product's
 * own business.
 */

export const USMartinLutherKingJrAfter1998Before2022 = new Holiday({
  name: 'Dr. Martin Luther King Jr. Day',
  month: 1,
  day: 1,
  startDate: DateTime.utc(1998, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const USMartinLutherKingJrAfter1998Before2015 = new Holiday({
  name: 'Dr. Martin Luther King Jr. Day',
  month: 1,
  day: 1,
  startDate: DateTime.utc(1998, 1, 1),
  endDate: DateTime.utc(2014, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const USMartinLutherKingJrAfter2015 = new Holiday({
  name: 'Dr. Martin Luther King Jr. Day',
  month: 1,
  day: 1,
  startDate: DateTime.utc(2015, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const USMartinLutherKingJrAfter1998Before2016FridayBefore = new Holiday({
  name: 'Dr. Martin Luther King Jr. Day',
  month: 1,
  day: 1,
  startDate: DateTime.utc(1998, 1, 1),
  endDate: DateTime.utc(2015, 12, 31),
  offset: [weekdayOffset(Weekday.MONDAY, 3), weekdayOffset(Weekday.FRIDAY, -1)],
})

export const USPresidentsDayBefore2022 = new Holiday({
  name: 'Presidents Day',
  month: 2,
  day: 1,
  startDate: DateTime.utc(1971, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const USPresidentsDayBefore2015 = new Holiday({
  name: 'Presidents Day',
  month: 2,
  day: 1,
  startDate: DateTime.utc(1971, 1, 1),
  endDate: DateTime.utc(2014, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const USPresidentsDayAfter2015 = new Holiday({
  name: 'Presidents Day',
  month: 2,
  day: 1,
  startDate: DateTime.utc(2015, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 3),
})

export const USPresidentsDayBefore2016FridayBefore = new Holiday({
  name: 'Presidents Day',
  month: 2,
  day: 1,
  startDate: DateTime.utc(1971, 1, 1),
  endDate: DateTime.utc(2015, 12, 31),
  offset: [weekdayOffset(Weekday.MONDAY, 3), weekdayOffset(Weekday.FRIDAY, -1)],
})

export const GoodFridayBefore2021 = new Holiday({
  name: 'Good Friday',
  month: 1,
  day: 1,
  endDate: DateTime.utc(2020, 12, 31),
  observance: easterOffset(-2),
})

export const GoodFriday2009 = new Holiday({
  name: 'Good Friday',
  month: 1,
  day: 1,
  startDate: DateTime.utc(2009, 1, 1),
  endDate: DateTime.utc(2009, 12, 31),
  observance: easterOffset(-3),
})

export const GoodFriday2021 = new Holiday({
  name: 'Good Friday',
  month: 1,
  day: 1,
  startDate: DateTime.utc(2021, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
  observance: easterOffset(-2),
})

export const GoodFriday2010 = new Holiday({
  name: 'Good Friday',
  month: 1,
  day: 1,
  startDate: DateTime.utc(2010, 1, 1),
  endDate: DateTime.utc(2010, 12, 31),
  observance: easterOffset(-2),
})

export const GoodFriday2012 = new Holiday({
  name: 'Good Friday',
  month: 1,
  day: 1,
  startDate: DateTime.utc(2012, 1, 1),
  endDate: DateTime.utc(2012, 12, 31),
  observance: easterOffset(-2),
})

export const GoodFriday2015 = new Holiday({
  name: 'Good Friday',
  month: 1,
  day: 1,
  startDate: DateTime.utc(2015, 1, 1),
  endDate: DateTime.utc(2015, 12, 31),
  observance: easterOffset(-2),
})

export const USMemorialDay2021AndPrior = new Holiday({
  name: 'Memorial Day',
  month: 5,
  day: 25,
  startDate: DateTime.utc(1971, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const USMemorialDay2013AndPrior = new Holiday({
  name: 'Memorial Day',
  month: 5,
  day: 25,
  startDate: DateTime.utc(1971, 1, 1),
  endDate: DateTime.utc(2013, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const USMemorialDayAfter2013 = new Holiday({
  name: 'Memorial Day',
  month: 5,
  day: 25,
  startDate: DateTime.utc(2014, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const USMemorialDay2015AndPriorFridayBefore = new Holiday({
  name: 'Memorial Day',
  month: 5,
  day: 25,
  startDate: DateTime.utc(1971, 1, 1),
  endDate: DateTime.utc(2015, 12, 31),
  offset: [weekdayOffset(Weekday.MONDAY, 1), weekdayOffset(Weekday.FRIDAY, -1)],
})

export const USIndependenceDayBefore2022 = new Holiday({
  name: 'July 4th',
  month: 7,
  day: 4,
  startDate: DateTime.utc(1954, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
  observance: nearestWorkday,
})

export const USIndependenceDayBefore2014 = new Holiday({
  name: 'July 4th',
  month: 7,
  day: 4,
  startDate: DateTime.utc(1954, 1, 1),
  endDate: DateTime.utc(2013, 12, 31),
  observance: nearestWorkday,
})

export const USIndependenceDayAfter2014 = new Holiday({
  name: 'July 4th',
  month: 7,
  day: 4,
  startDate: DateTime.utc(2014, 1, 1),
  observance: nearestWorkday,
})

export const USLaborDayStarting1887Before2022 = new Holiday({
  name: 'Labor Day',
  month: 9,
  day: 1,
  startDate: DateTime.utc(1887, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const USLaborDayStarting1887Before2014 = new Holiday({
  name: 'Labor Day',
  month: 9,
  day: 1,
  startDate: DateTime.utc(1887, 1, 1),
  endDate: DateTime.utc(2013, 12, 31),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const USLaborDayStarting1887Before2015FridayBefore = new Holiday({
  name: 'Labor Day',
  month: 9,
  day: 1,
  startDate: DateTime.utc(1887, 1, 1),
  endDate: DateTime.utc(2014, 12, 31),
  offset: [weekdayOffset(Weekday.MONDAY, 1), weekdayOffset(Weekday.FRIDAY, -1)],
})

export const USLaborDayStarting1887After2014 = new Holiday({
  name: 'Labor Day',
  month: 9,
  day: 1,
  startDate: DateTime.utc(2014, 1, 1),
  offset: weekdayOffset(Weekday.MONDAY, 1),
})

export const USThanksgivingBefore2022 = new Holiday({
  name: 'ThanksgivingFriday',
  month: 11,
  day: 1,
  startDate: DateTime.utc(1942, 1, 1),
  endDate: DateTime.utc(2021, 12, 31),
  offset: weekdayOffset(Weekday.THURSDAY, 4),
})

export const USThanksgivingBefore2014 = new Holiday({
  name: 'ThanksgivingFriday',
  month: 11,
  day: 1,
  startDate: DateTime.utc(1942, 1, 1),
  endDate: DateTime.utc(2013, 12, 31),
  offset: weekdayOffset(Weekday.THURSDAY, 4),
})

export const USThanksgivingAfter2014 = new Holiday({
  name: 'ThanksgivingFriday',
  month: 11,
  day: 1,
  startDate: DateTime.utc(2014, 1, 1),
  offset: weekdayOffset(Weekday.THURSDAY, 4),
})

export const USThanksgivingFriday = new Holiday({
  name: 'ThanksgivingFriday',
  month: 11,
  day: 1,
  startDate: DateTime.utc(1942, 1, 1),
  offset: [weekdayOffset(Weekday.THURSDAY, 4), plusOneDay],
})
