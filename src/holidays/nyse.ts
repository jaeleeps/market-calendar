import { DateTime } from 'luxon'
import { Weekday } from '../utils/constants'
import { Holiday } from '../core/Holiday'

/**
 * Saturday closures of the New York Stock Exchange.
 *
 * The exchange traded on Saturdays until 1952-09-29, but not on all of them.
 * Without these dates a calendar reports every pre-1952 Saturday as a session,
 * which is roughly eighteen weeks a year too many from 1945 on.
 *
 * Ported from the reference implementation's `holidays/nyse.py`.
 */

/** Read a list of ISO dates as UTC dates. */
const dates = (iso: string[]): DateTime[] =>
  iso.map((d) => DateTime.fromISO(d, { zone: 'utc' }))

/**
 * Every Saturday from `from` to `to`, inclusive.
 *
 * @param from - First Saturday of the run
 * @param to - Last date of the run
 * @returns One DateTime per Saturday
 * @throws If `from` is not a Saturday, which would shift the whole run
 */
export function saturdays(from: string, to: string): DateTime[] {
  let current = DateTime.fromISO(from, { zone: 'utc' })
  const end = DateTime.fromISO(to, { zone: 'utc' })
  if (current.weekday !== Weekday.SATURDAY) {
    throw new Error(`${from} is not a Saturday`)
  }

  const result: DateTime[] = []
  while (current <= end) {
    result.push(current)
    current = current.plus({ weeks: 1 })
  }
  return result
}

/** The Saturday before New Year's Day, closed only in 1916. */
export const SatBeforeNewYearsAdhoc = dates(['1916-12-30'])

/** The Saturday before Washington's Birthday. */
export const SatBeforeWashingtonsBirthdayAdhoc = dates(['1903-02-21'])

/** The Saturday after Washington's Birthday; not every year was a holiday. */
export const SatAfterWashingtonsBirthdayAdhoc = dates([
  '1901-02-23',
  '1907-02-23',
  '1929-02-23',
  '1946-02-23',
])

/** The Saturdays around Lincoln's Birthday that were holidays. */
export const SatBeforeAfterLincolnsBirthdayAdhoc = dates([
  '1899-02-11',
  '1909-02-13',
])

/** The Saturday after Good Friday. */
export const SatAfterGoodFridayAdhoc = dates([
  '1900-04-14',
  '1901-04-06',
  '1902-03-29',
  '1903-04-11',
  '1905-04-22',
  '1907-03-30',
  '1908-04-18',
  '1909-04-10',
  '1910-03-26',
  '1911-04-15',
  '1913-03-22',
  '1920-04-03',
  '1929-03-30',
  '1930-04-19',
])

/** The Saturday before Decoration Day. */
export const SatBeforeDecorationAdhoc = dates([
  '1904-05-28',
  '1909-05-29',
  '1910-05-28',
  '1921-05-28',
  '1926-05-29',
  '1937-05-29',
])

/** The Saturday after Decoration Day. */
export const SatAfterDecorationAdhoc = dates([
  '1902-05-31',
  '1913-05-31',
  '1919-05-31',
  '1924-05-31',
  '1930-05-31',
])

/** The Saturday before Independence Day. */
export const SatBeforeIndependenceDayAdhoc = dates([
  '1887-07-02',
  '1892-07-02',
  '1898-07-02',
  '1904-07-02',
  '1909-07-03',
  '1910-07-02',
  '1920-07-03',
  '1921-07-02',
  '1926-07-03',
  '1932-07-02',
  '1937-07-03',
])

/** The Saturday after Independence Day. */
export const SatAfterIndependenceDayAdhoc = dates([
  '1890-07-05',
  '1902-07-05',
  '1913-07-05',
  '1919-07-05',
  '1930-07-05',
])

/** The Saturday before Labor Day. */
export const SatBeforeLaborDayAdhoc = dates([
  '1888-09-01',
  '1898-09-03',
  '1900-09-01',
  '1901-08-31',
  '1902-08-30',
  '1903-09-05',
  '1904-09-03',
  '1907-08-31',
  '1908-09-05',
  '1909-09-04',
  '1910-09-03',
  '1911-09-02',
  '1912-08-31',
  '1913-08-30',
  '1917-09-01',
  '1919-08-30',
  '1920-09-04',
  '1921-09-03',
  '1926-09-04',
  '1929-08-31',
  '1930-08-30',
  '1931-09-05',
])

/** The Saturday after Columbus Day. */
export const SatAfterColumbusDayAdHoc = dates(['1917-10-13', '1945-10-13'])

/** The Saturday before Christmas. */
export const SatBeforeChristmasAdhoc = dates([
  '1887-12-24',
  '1898-12-24',
  '1904-12-24',
  '1910-12-24',
  '1911-12-23',
  '1922-12-23',
  '1949-12-24',
  '1950-12-23',
])

/** The Saturday after Christmas. */
export const SatAfterChristmasAdhoc = dates([
  '1891-12-26',
  '1896-12-26',
  '1903-12-26',
  '1908-12-26',
  '1925-12-26',
  '1931-12-26',
  '1936-12-26',
])

/** Saturdays closed in 1944, before the summer shutdowns began. */
export const SatClosings1944 = dates(['1944-08-19', '1944-08-26', '1944-09-02'])

// From 1945 the exchange shut on Saturdays over the summer.
export const SatClosings1945 = saturdays('1945-07-07', '1945-09-01')

export const SatClosings1946 = saturdays('1946-06-01', '1946-09-28')

export const SatClosings1947 = saturdays('1947-05-31', '1947-09-27')

export const SatClosings1948 = saturdays('1948-05-29', '1948-09-25')

export const SatClosings1949 = saturdays('1949-05-28', '1949-09-24')

export const SatClosings1950 = saturdays('1950-06-03', '1950-09-30')

export const SatClosings1951 = saturdays('1951-06-02', '1951-09-29')

export const SatClosings1952 = saturdays('1952-05-31', '1952-09-27')

/** Every Saturday the exchange was shut while it still traded on Saturdays. */
export const NYSESaturdayClosings: DateTime[] = [
  ...SatBeforeNewYearsAdhoc,
  ...SatBeforeWashingtonsBirthdayAdhoc,
  ...SatAfterWashingtonsBirthdayAdhoc,
  ...SatBeforeAfterLincolnsBirthdayAdhoc,
  ...SatAfterGoodFridayAdhoc,
  ...SatBeforeDecorationAdhoc,
  ...SatAfterDecorationAdhoc,
  ...SatBeforeIndependenceDayAdhoc,
  ...SatAfterIndependenceDayAdhoc,
  ...SatBeforeLaborDayAdhoc,
  ...SatAfterColumbusDayAdHoc,
  ...SatBeforeChristmasAdhoc,
  ...SatAfterChristmasAdhoc,
  ...SatClosings1944,
  ...SatClosings1945,
  ...SatClosings1946,
  ...SatClosings1947,
  ...SatClosings1948,
  ...SatClosings1949,
  ...SatClosings1950,
  ...SatClosings1951,
  ...SatClosings1952,
]

/** A time the exchange observed, and the dates it observed it. */
export interface SpecialTimeDates {
  /** The wall-clock time, as [hour, minute]. */
  time: [hour: number, minute: number]
  /** The dates that observed it. */
  dates: DateTime[]
}

/**
 * Christmas Eve closes at 13:00 when it falls Monday to Thursday, from 1999.
 *
 * Earlier 13:00 Christmas Eves are listed date by date instead: the rule did
 * not hold before then, and 1974 to 1992 closed at 14:00 rather than 13:00.
 */
export const ChristmasEvePost1999Early1pmClose = new Holiday({
  name: 'Christmas Eve 1pm close from 1999',
  month: 12,
  day: 24,
  daysOfWeek: [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
  ],
  startDate: DateTime.utc(1999, 1, 1),
})

/**
 * The Friday after Independence Day was a half day until 2013.
 *
 * The NYSE rule starts in 1996, a year later than the general US one.
 */
export const FridayAfterIndependenceDayNYSEpre2013 = new Holiday({
  name: 'Friday after Independence Day before 2013',
  month: 7,
  day: 5,
  daysOfWeek: [Weekday.FRIDAY],
  startDate: DateTime.utc(1996, 1, 1),
  endDate: DateTime.utc(2012, 12, 31),
})

/**
 * Days the exchange closed early, grouped by the time it closed.
 *
 * Later groups win where a date appears twice, so the 14:00 group takes
 * precedence over the 13:00 one.
 */
export const NYSEEarlyCloses: SpecialTimeDates[] = [
  {
    time: [11, 0],
    dates: dates(['1910-05-07']),
  },
  {
    time: [12, 0],
    dates: dates([
      '1917-08-29',
      '1917-10-24',
      '1918-04-26',
      '1920-09-16',
      '1933-09-13',
    ]),
  },
  {
    time: [12, 30],
    dates: dates(['1919-01-07', '1924-02-06', '1930-03-11', '1933-08-04']),
  },
  {
    time: [13, 0],
    dates: dates([
      '1908-06-26',
      '1929-11-06',
      '1929-11-07',
      '1929-11-08',
      '1929-11-11',
      '1929-11-12',
      '1929-11-13',
      '1929-11-14',
      '1929-11-15',
      '1929-11-18',
      '1929-11-19',
      '1929-11-20',
      '1929-11-21',
      '1929-11-22',
      '1951-12-24',
      '1996-12-24',
      '1997-12-24',
      '1997-12-26',
      '1998-12-24',
      '1999-12-24',
      '2003-12-26',
    ]),
  },
  {
    time: [14, 0],
    dates: dates([
      '1928-05-21',
      '1928-05-22',
      '1928-05-23',
      '1928-05-24',
      '1928-05-25',
      '1933-07-26',
      '1933-07-27',
      '1933-07-28',
      '1964-10-23',
      '1966-01-06',
      '1966-01-07',
      '1966-01-10',
      '1966-01-11',
      '1966-01-12',
      '1966-01-13',
      '1966-01-14',
      '1967-02-07',
      '1967-08-09',
      '1967-08-10',
      '1967-08-11',
      '1967-08-14',
      '1967-08-15',
      '1967-08-16',
      '1967-08-17',
      '1967-08-18',
      '1968-01-22',
      '1968-01-23',
      '1968-01-24',
      '1968-01-25',
      '1968-01-26',
      '1968-01-29',
      '1968-01-30',
      '1968-01-31',
      '1968-02-01',
      '1968-02-02',
      '1968-02-05',
      '1968-02-06',
      '1968-02-07',
      '1968-02-08',
      '1968-02-09',
      '1968-02-12',
      '1968-02-13',
      '1968-02-14',
      '1968-02-15',
      '1968-02-16',
      '1968-02-19',
      '1968-02-20',
      '1968-02-21',
      '1968-02-22',
      '1968-02-23',
      '1968-02-26',
      '1968-02-27',
      '1968-02-28',
      '1968-02-29',
      '1968-03-01',
      '1969-01-01',
      '1969-01-02',
      '1969-01-03',
      '1969-01-06',
      '1969-01-07',
      '1969-01-08',
      '1969-01-09',
      '1969-01-10',
      '1969-01-13',
      '1969-01-14',
      '1969-01-15',
      '1969-01-16',
      '1969-01-17',
      '1969-01-20',
      '1969-01-21',
      '1969-01-22',
      '1969-01-23',
      '1969-01-24',
      '1969-01-27',
      '1969-01-28',
      '1969-01-29',
      '1969-01-30',
      '1969-01-31',
      '1969-02-03',
      '1969-02-04',
      '1969-02-05',
      '1969-02-06',
      '1969-02-07',
      '1969-02-10',
      '1969-02-11',
      '1969-02-12',
      '1969-02-13',
      '1969-02-14',
      '1969-02-17',
      '1969-02-18',
      '1969-02-19',
      '1969-02-20',
      '1969-02-21',
      '1969-02-24',
      '1969-02-25',
      '1969-02-26',
      '1969-02-27',
      '1969-02-28',
      '1969-03-03',
      '1969-03-04',
      '1969-03-05',
      '1969-03-06',
      '1969-03-07',
      '1969-03-10',
      '1969-03-11',
      '1969-03-12',
      '1969-03-13',
      '1969-03-14',
      '1969-03-17',
      '1969-03-18',
      '1969-03-19',
      '1969-03-20',
      '1969-03-21',
      '1969-03-24',
      '1969-03-25',
      '1969-03-26',
      '1969-03-27',
      '1969-03-28',
      '1969-03-31',
      '1969-04-01',
      '1969-04-02',
      '1969-04-03',
      '1969-04-04',
      '1969-04-07',
      '1969-04-08',
      '1969-04-09',
      '1969-04-10',
      '1969-04-11',
      '1969-04-14',
      '1969-04-15',
      '1969-04-16',
      '1969-04-17',
      '1969-04-18',
      '1969-04-21',
      '1969-04-22',
      '1969-04-23',
      '1969-04-24',
      '1969-04-25',
      '1969-04-28',
      '1969-04-29',
      '1969-04-30',
      '1969-05-01',
      '1969-05-02',
      '1969-05-05',
      '1969-05-06',
      '1969-05-07',
      '1969-05-08',
      '1969-05-09',
      '1969-05-12',
      '1969-05-13',
      '1969-05-14',
      '1969-05-15',
      '1969-05-16',
      '1969-05-19',
      '1969-05-20',
      '1969-05-21',
      '1969-05-22',
      '1969-05-23',
      '1969-05-26',
      '1969-05-27',
      '1969-05-28',
      '1969-05-29',
      '1969-05-30',
      '1969-06-02',
      '1969-06-03',
      '1969-06-04',
      '1969-06-05',
      '1969-06-06',
      '1969-06-09',
      '1969-06-10',
      '1969-06-11',
      '1969-06-12',
      '1969-06-13',
      '1969-06-16',
      '1969-06-17',
      '1969-06-18',
      '1969-06-19',
      '1969-06-20',
      '1969-06-23',
      '1969-06-24',
      '1969-06-25',
      '1969-06-26',
      '1969-06-27',
      '1969-06-30',
      '1969-07-01',
      '1969-07-02',
      '1969-07-03',
      '1974-12-24',
      '1975-12-24',
      '1978-02-06',
      '1987-10-23',
      '1987-10-24',
      '1987-10-25',
      '1987-10-26',
      '1987-10-27',
      '1987-10-28',
      '1987-10-29',
      '1987-10-30',
      '1990-12-24',
      '1991-12-24',
      '1992-12-24',
      '1996-01-08',
    ]),
  },
  {
    time: [14, 7],
    dates: dates(['1963-11-22']),
  },
  {
    time: [14, 30],
    dates: dates([
      '1918-11-07',
      '1925-09-18',
      '1969-07-07',
      '1969-07-08',
      '1969-07-09',
      '1969-07-10',
      '1969-07-11',
      '1969-07-14',
      '1969-07-15',
      '1969-07-16',
      '1969-07-17',
      '1969-07-18',
      '1969-07-21',
      '1969-07-22',
      '1969-07-23',
      '1969-07-24',
      '1969-07-25',
      '1969-07-28',
      '1969-07-29',
      '1969-07-30',
      '1969-07-31',
      '1969-08-01',
      '1969-08-04',
      '1969-08-05',
      '1969-08-06',
      '1969-08-07',
      '1969-08-08',
      '1969-08-11',
      '1969-08-12',
      '1969-08-13',
      '1969-08-14',
      '1969-08-15',
      '1969-08-18',
      '1969-08-19',
      '1969-08-20',
      '1969-08-21',
      '1969-08-22',
      '1969-08-25',
      '1969-08-26',
      '1969-08-27',
      '1969-08-28',
      '1969-08-29',
      '1969-09-01',
      '1969-09-02',
      '1969-09-03',
      '1969-09-04',
      '1969-09-05',
      '1969-09-08',
      '1969-09-09',
      '1969-09-10',
      '1969-09-11',
      '1969-09-12',
      '1969-09-15',
      '1969-09-16',
      '1969-09-17',
      '1969-09-18',
      '1969-09-19',
      '1969-09-22',
      '1969-09-23',
      '1969-09-24',
      '1969-09-25',
      '1969-09-26',
      '1975-02-12',
      '1987-11-02',
      '1987-11-03',
      '1987-11-04',
      '1994-02-11',
    ]),
  },
  {
    time: [15, 0],
    dates: dates([
      '1969-09-29',
      '1969-09-30',
      '1969-10-01',
      '1969-10-02',
      '1969-10-03',
      '1969-10-06',
      '1969-10-07',
      '1969-10-08',
      '1969-10-09',
      '1969-10-10',
      '1969-10-13',
      '1969-10-14',
      '1969-10-15',
      '1969-10-16',
      '1969-10-17',
      '1969-10-20',
      '1969-10-21',
      '1969-10-22',
      '1969-10-23',
      '1969-10-24',
      '1969-10-27',
      '1969-10-28',
      '1969-10-29',
      '1969-10-30',
      '1969-10-31',
      '1969-11-03',
      '1969-11-04',
      '1969-11-05',
      '1969-11-06',
      '1969-11-07',
      '1969-11-10',
      '1969-11-11',
      '1969-11-12',
      '1969-11-13',
      '1969-11-14',
      '1969-11-17',
      '1969-11-18',
      '1969-11-19',
      '1969-11-20',
      '1969-11-21',
      '1969-11-24',
      '1969-11-25',
      '1969-11-26',
      '1969-11-27',
      '1969-11-28',
      '1969-12-01',
      '1969-12-02',
      '1969-12-03',
      '1969-12-04',
      '1969-12-05',
      '1969-12-08',
      '1969-12-09',
      '1969-12-10',
      '1969-12-11',
      '1969-12-12',
      '1969-12-15',
      '1969-12-16',
      '1969-12-17',
      '1969-12-18',
      '1969-12-19',
      '1969-12-22',
      '1969-12-23',
      '1969-12-24',
      '1969-12-25',
      '1969-12-26',
      '1969-12-29',
      '1969-12-30',
      '1969-12-31',
      '1970-01-01',
      '1970-01-02',
      '1970-01-05',
      '1970-01-06',
      '1970-01-07',
      '1970-01-08',
      '1970-01-09',
      '1970-01-12',
      '1970-01-13',
      '1970-01-14',
      '1970-01-15',
      '1970-01-16',
      '1970-01-19',
      '1970-01-20',
      '1970-01-21',
      '1970-01-22',
      '1970-01-23',
      '1970-01-26',
      '1970-01-27',
      '1970-01-28',
      '1970-01-29',
      '1970-01-30',
      '1970-02-02',
      '1970-02-03',
      '1970-02-04',
      '1970-02-05',
      '1970-02-06',
      '1970-02-09',
      '1970-02-10',
      '1970-02-11',
      '1970-02-12',
      '1970-02-13',
      '1970-02-16',
      '1970-02-17',
      '1970-02-18',
      '1970-02-19',
      '1970-02-20',
      '1970-02-23',
      '1970-02-24',
      '1970-02-25',
      '1970-02-26',
      '1970-02-27',
      '1970-03-02',
      '1970-03-03',
      '1970-03-04',
      '1970-03-05',
      '1970-03-06',
      '1970-03-09',
      '1970-03-10',
      '1970-03-11',
      '1970-03-12',
      '1970-03-13',
      '1970-03-16',
      '1970-03-17',
      '1970-03-18',
      '1970-03-19',
      '1970-03-20',
      '1970-03-23',
      '1970-03-24',
      '1970-03-25',
      '1970-03-26',
      '1970-03-27',
      '1970-03-30',
      '1970-03-31',
      '1970-04-01',
      '1970-04-02',
      '1970-04-03',
      '1970-04-06',
      '1970-04-07',
      '1970-04-08',
      '1970-04-09',
      '1970-04-10',
      '1970-04-13',
      '1970-04-14',
      '1970-04-15',
      '1970-04-16',
      '1970-04-17',
      '1970-04-20',
      '1970-04-21',
      '1970-04-22',
      '1970-04-23',
      '1970-04-24',
      '1970-04-27',
      '1970-04-28',
      '1970-04-29',
      '1970-04-30',
      '1970-05-01',
      '1976-08-09',
      '1987-11-05',
      '1987-11-06',
    ]),
  },
  {
    time: [15, 17],
    dates: dates(['1981-03-30']),
  },
  {
    time: [15, 28],
    dates: dates(['1981-09-09']),
  },
  {
    time: [15, 30],
    dates: dates(['1987-11-09', '1987-11-10', '1987-11-11', '1997-10-27']),
  },
  {
    time: [15, 56],
    dates: dates(['2005-06-01']),
  },
]

/**
 * Days the exchange opened late, grouped by the time it opened.
 */
export const NYSELateOpens: SpecialTimeDates[] = [
  {
    time: [9, 31],
    dates: dates(['1990-12-27', '1991-01-17', '1991-02-25', '2001-10-08']),
  },
  {
    time: [9, 32],
    dates: dates(['2003-03-20', '2004-06-07', '2006-12-27']),
  },
  {
    time: [9, 33],
    dates: dates(['2001-09-17']),
  },
  {
    time: [10, 15],
    dates: dates(['1967-02-07', '1974-01-16', '1974-11-22', '1976-06-08']),
  },
  {
    time: [10, 30],
    dates: dates(['1919-12-30', '1920-02-06', '1995-12-18']),
  },
  {
    time: [10, 45],
    dates: dates(['1925-01-24', '1969-06-02']),
  },
  {
    time: [11, 0],
    dates: dates([
      '1933-07-26',
      '1933-07-27',
      '1933-07-28',
      '1934-02-20',
      '1936-01-28',
      '1960-12-12',
      '1969-02-11',
      '1973-12-17',
      '1978-02-07',
      '1989-11-10',
      '1996-01-08',
    ]),
  },
  {
    time: [11, 5],
    dates: dates(['1965-11-10']),
  },
  {
    time: [11, 15],
    dates: dates(['1976-02-02']),
  },
  {
    time: [12, 0],
    dates: dates([
      '1910-05-20',
      '1913-04-14',
      '1913-09-22',
      '1929-10-31',
      '1933-07-24',
      '1933-07-25',
      '1978-01-20',
      '2002-09-11',
    ]),
  },
  {
    time: [13, 0],
    dates: dates(['1921-08-02']),
  },
]

/** The 13:00 half-days, which also end their post session at 17:00. */
export const NYSEEarlyClose1pmDates: DateTime[] =
  NYSEEarlyCloses.find((g) => g.time[0] === 13 && g.time[1] === 0)?.dates ?? []
