import { DateTime } from 'luxon'
import { Weekday } from '../utils/constants'

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
