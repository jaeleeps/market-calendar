import { DateTime } from 'luxon'
import { Holiday } from '../core/Holiday'
import { sundayToMonday, nearestWorkday, weekdayOffset } from '../utils/rules'
import { Weekday } from '../utils/constants'

const { MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY } = Weekday

/**
 * Observance rule for Election Day 1968-1980: First Tuesday every four years.
 * @param dt - Luxon DateTime object
 * @returns Adjusted DateTime
 */
function followingTuesdayEveryFourYearsObservance(dt: DateTime): DateTime {
  const yearsToAdd = (4 - (dt.year % 4)) % 4
  return dt.plus({ years: yearsToAdd }).set({ weekday: 2 })
}

export const ChristmasEveBefore1993 = new Holiday({
  name: 'Christmas Eve',
  month: 12,
  day: 24,
  endDate: DateTime.utc(1993, 1, 1),
  // When Christmas is a Saturday, the 24th is a full holiday.
  daysOfWeek: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY],
})

export const ChristmasEveInOrAfter1993 = new Holiday({
  name: 'Christmas Eve',
  month: 12,
  day: 24,
  startDate: DateTime.utc(1993, 1, 1),
  // When Christmas is a Saturday, the 24th is a full holiday.
  daysOfWeek: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY],
})

export const USNewYearsDay = new Holiday({
  name: 'New Years Day',
  month: 1,
  day: 1,
  // When Jan 1 is a Sunday, US markets observe the subsequent Monday.
  // When Jan 1 is a Saturday (as in 2005 and 2011), no holiday is observed.
  observance: sundayToMonday,
})

export const USMartinLutherKingJrAfter1998 = new Holiday({
  name: 'Dr. Martin Luther King Jr. Day',
  month: 1,
  day: 1,
  // The US markets didn't observe MLK day as a holiday until 1998.
  startDate: DateTime.utc(1998, 1, 1),
  offset: weekdayOffset(MONDAY, 3),
})

export const USLincolnsBirthDayBefore1954 = new Holiday({
  name: "Lincoln's Birthday",
  month: 2,
  day: 12,
  startDate: DateTime.utc(1874, 1, 1),
  endDate: DateTime.utc(1953, 12, 31),
  observance: sundayToMonday,
})

export const USWashingtonsBirthDayBefore1964 = new Holiday({
  name: "Washington's Birthday",
  month: 2,
  day: 22,
  startDate: DateTime.utc(1880, 1, 1),
  endDate: DateTime.utc(1963, 12, 31),
  observance: sundayToMonday,
})

export const USWashingtonsBirthDay1964to1970 = new Holiday({
  name: "Washington's Birthday",
  month: 2,
  day: 22,
  startDate: DateTime.utc(1964, 1, 1),
  endDate: DateTime.utc(1970, 12, 31),
  observance: nearestWorkday,
})

export const USPresidentsDay = new Holiday({
  name: "President's Day",
  startDate: DateTime.utc(1971, 1, 1),
  month: 2,
  day: 1,
  offset: weekdayOffset(MONDAY, 3),
})

export const USThanksgivingDayBefore1939 = new Holiday({
  name: 'Thanksgiving Before 1939',
  startDate: DateTime.utc(1864, 1, 1),
  endDate: DateTime.utc(1938, 12, 31),
  month: 11,
  day: 30,
  offset: weekdayOffset(THURSDAY, -1),
})

export const USThanksgivingDay1939to1941 = new Holiday({
  name: 'Thanksgiving 1939 to 1941',
  startDate: DateTime.utc(1939, 1, 1),
  endDate: DateTime.utc(1941, 12, 31),
  month: 11,
  day: 30,
  offset: weekdayOffset(THURSDAY, -2),
})

export const USThanksgivingDay = new Holiday({
  name: 'Thanksgiving',
  startDate: DateTime.utc(1942, 1, 1),
  month: 11,
  day: 1,
  offset: weekdayOffset(THURSDAY, 4),
})

export const USMemorialDayBefore1964 = new Holiday({
  name: 'Memorial Day',
  month: 5,
  day: 30,
  endDate: DateTime.utc(1963, 12, 31),
  observance: sundayToMonday,
})

export const USMemorialDay1964to1969 = new Holiday({
  name: 'Memorial Day',
  month: 5,
  day: 30,
  startDate: DateTime.utc(1964, 1, 1),
  endDate: DateTime.utc(1969, 12, 31),
  observance: nearestWorkday,
})

export const USMemorialDay = new Holiday({
  name: 'Memorial Day',
  month: 5,
  day: 25,
  startDate: DateTime.utc(1971, 1, 1),
  offset: weekdayOffset(MONDAY, 1),
})

export const USIndependenceDayBefore1954 = new Holiday({
  name: 'July 4th',
  month: 7,
  day: 4,
  endDate: DateTime.utc(1953, 12, 31),
  observance: sundayToMonday,
})

export const USIndependence = new Holiday({
  name: 'July 4th',
  month: 7,
  day: 4,
  endDate: DateTime.utc(1954, 1, 1),
  observance: nearestWorkday,
})

export const USElectionDay1848to1967 = new Holiday({
  name: 'Election Day',
  month: 11,
  day: 2,
  startDate: DateTime.utc(1848, 1, 1),
  endDate: DateTime.utc(1967, 12, 31),
  offset: weekdayOffset(TUESDAY, 1),
})

export const USElectionDay1968to1980 = new Holiday({
  name: 'Election Day',
  month: 11,
  day: 2,
  startDate: DateTime.utc(1968, 1, 1),
  endDate: DateTime.utc(1980, 12, 31),
  observance: followingTuesdayEveryFourYearsObservance,
})

export const USVeteransDay1934to1953 = new Holiday({
  name: 'Veteran Day',
  month: 11,
  day: 11,
  startDate: DateTime.utc(1834, 1, 1),
  endDate: DateTime.utc(1953, 12, 31),
  observance: sundayToMonday,
})

export const USColumbusDayBefore1954 = new Holiday({
  name: 'Columbus Day',
  month: 10,
  day: 12,
  endDate: DateTime.utc(1953, 12, 31),
  observance: sundayToMonday,
})

export const ChristmasBefore1954 = new Holiday({
  name: 'Christmas',
  month: 12,
  day: 25,
  endDate: DateTime.utc(1953, 12, 31),
  observance: sundayToMonday,
})

export const Christmas = new Holiday({
  name: 'Christmas',
  month: 12,
  day: 25,
  startDate: DateTime.utc(1954, 1, 1),
  observance: nearestWorkday,
})

export const MonTuesThursBeforeIndependenceDay = new Holiday({
  // When July 4th is a Tuesday, Wednesday, or Friday, the previous day is a half day.
  name: 'Mondays, Tuesdays, and Thursdays Before Independence Day',
  month: 7,
  day: 3,
  daysOfWeek: [MONDAY, TUESDAY, THURSDAY],
  startDate: DateTime.utc(1995, 1, 1),
})

export const FridayAfterIndependenceDayPre2013 = new Holiday({
  // When July 4th is a Thursday, the next day is a half day prior to 2013.
  // Since 2013 the early close is on Wednesday and Friday is a full day
  name: 'Fridays after Independence Day prior to 2013',
  month: 7,
  day: 5,
  daysOfWeek: [FRIDAY],
  startDate: DateTime.utc(1995, 1, 1),
  endDate: DateTime.utc(2012, 12, 31),
})

export const WednesdayBeforeIndependenceDayPost2013 = new Holiday({
  // Since 2013 the early close is on Wednesday and Friday is a full day
  name: 'Wednesdays Before Independence Day including and after 2013',
  month: 7,
  day: 3,
  daysOfWeek: [WEDNESDAY],
  startDate: DateTime.utc(2013, 1, 1),
})

export const USBlackFridayBefore1993 = new Holiday({
  name: 'Black Friday',
  month: 11,
  day: 1,
  startDate: DateTime.utc(1992, 1, 1),
  endDate: DateTime.utc(1993, 1, 1),
  offset: [weekdayOffset(THURSDAY, 4), (dt: DateTime) => dt.plus({ days: 1 })],
})

export const USBlackFridayInOrAfter1993 = new Holiday({
  name: 'Black Friday',
  month: 11,
  day: 1,
  startDate: DateTime.utc(1993, 1, 1),
  offset: [weekdayOffset(THURSDAY, 4), (dt: DateTime) => dt.plus({ days: 1 })],
})

export const BattleOfGettysburg = new Holiday({
  // All of the floor traders in Chicago were sent to PA
  name: 'Markets were closed during the battle of Gettysburg',
  month: 7,
  day: [1, 2, 3],
  startDate: DateTime.utc(1863, 7, 1),
  endDate: DateTime.utc(1863, 7, 3),
})

// The following holidays are non-pattern, ad-hoc full-day closings.
export const November29BacklogRelief = [DateTime.utc(1929, 11, 29)]
export const March33BankHoliday = [
  DateTime.utc(1933, 3, 6),
  DateTime.utc(1933, 3, 7),
  DateTime.utc(1933, 3, 8),
  DateTime.utc(1933, 3, 9),
  DateTime.utc(1933, 3, 10),
  DateTime.utc(1933, 3, 13),
  DateTime.utc(1933, 3, 14),
]
export const August45VictoryOverJapan = [
  DateTime.utc(1945, 8, 15),
  DateTime.utc(1945, 8, 16),
]
export const ChristmasEvesAdhoc = [
  DateTime.utc(1945, 12, 24),
  DateTime.utc(1956, 12, 24),
]
export const DayAfterChristmasAdhoc = [DateTime.utc(1958, 12, 26)]
export const DayBeforeDecorationAdhoc = [DateTime.utc(1961, 5, 29)]
export const LincolnsBirthDayAdhoc = [DateTime.utc(1968, 2, 12)]
export const PaperworkCrisis68 = [
  '1968-06-12',
  '1968-06-19',
  '1968-06-26',
  '1968-07-10',
  '1968-07-17',
  '1968-07-24',
  '1968-07-31',
  '1968-08-07',
  '1968-08-14',
  '1968-08-21',
  '1968-08-28',
  '1968-09-11',
  '1968-09-18',
  '1968-09-25',
  '1968-10-02',
  '1968-10-09',
  '1968-10-16',
  '1968-10-23',
  '1968-10-30',
  '1968-11-11',
  '1968-11-20',
  '1968-12-04',
  '1968-12-11',
  '1968-12-18',
  '1968-12-25',
].map((d) => DateTime.fromISO(d, { zone: 'utc' }))
export const DayAfterIndependenceDayAdhoc = [DateTime.utc(1968, 7, 5)]
export const WeatherSnowClosing = [DateTime.utc(1969, 2, 10)]
export const FirstLunarLandingClosing = [DateTime.utc(1969, 7, 21)]
export const NewYorkCityBlackout77 = [DateTime.utc(1977, 7, 14)]
export const September11Closings = [
  DateTime.utc(2001, 9, 11),
  DateTime.utc(2001, 9, 12),
  DateTime.utc(2001, 9, 13),
  DateTime.utc(2001, 9, 14),
]
export const HurricaneGloriaClosings = [DateTime.utc(1985, 9, 27)]
export const HurricaneSandyClosings = [
  DateTime.utc(2012, 10, 29),
  DateTime.utc(2012, 10, 30),
]

// National Days of Mourning
// - President John F. Kennedy - November 25, 1963
// - Martin Luther King - April 9, 1968
// - President Dwight D. Eisenhower - March 31, 1969
// - President Harry S. Truman - December 28, 1972
// - President Lyndon B. Johnson - January 25, 1973
// - President Richard Nixon - April 27, 1994
// - President Ronald W. Reagan - June 11, 2004
// - President Gerald R. Ford - Jan 2, 2007
// - President George H.W. Bush - Dec 5, 2018
export const USNationalDaysofMourning = [
  '1963-11-25',
  '1968-04-09',
  '1969-03-31',
  '1972-12-28',
  '1973-01-25',
  '1994-04-27',
  '2004-06-11',
  '2007-01-02',
  '2018-12-05',
].map((date) => DateTime.fromISO(date, { zone: 'utc' }))

export const USJuneteenthAfter2022 = new Holiday({
  name: 'Juneteenth Starting at 2022',
  startDate: DateTime.utc(2022, 6, 19),
  month: 6,
  day: 19,
  observance: nearestWorkday,
})
