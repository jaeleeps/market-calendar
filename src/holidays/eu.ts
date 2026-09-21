import { Holiday } from '../core/Holiday'
import { easterOffset, previousFriday } from '../utils/rules'
import { Weekday } from '../utils/constants'

/**
 * Holidays of the continental European exchanges.
 *
 * Much of Europe hangs its spring holidays off Easter, so Ascension Day and
 * Whit Monday are stated as offsets from it rather than as dates.
 */

/** Every weekday, for holidays simply skipped when they fall at a weekend. */
const WEEKDAYS = [
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
]

/** New Year's Day, when it falls on a weekday. */
export const EUNewYearsDay = new Holiday({
  name: "New Year's Day",
  month: 1,
  day: 1,
  daysOfWeek: WEEKDAYS,
})

/** Berthold's Day, the Swiss second of January. */
export const BertholdsDay = new Holiday({
  name: "Berthold's Day",
  month: 1,
  day: 2,
  daysOfWeek: WEEKDAYS,
})

/** Labour Day on the first of May, when it falls on a weekday. */
export const EUMayDay = new Holiday({
  name: 'May Day',
  month: 5,
  day: 1,
  daysOfWeek: WEEKDAYS,
})

/** Ascension Day: thirty-nine days after Easter, always a Thursday. */
export const AscensionDay = new Holiday({
  name: 'Ascension Day',
  month: 1,
  day: 1,
  observance: easterOffset(39),
})

/** Whit Monday, also called Pentecost Monday: fifty days after Easter. */
export const WhitMonday = new Holiday({
  name: 'Whit Monday',
  month: 1,
  day: 1,
  observance: easterOffset(50),
})

/** Swiss National Day, when it falls on a weekday. */
export const SwissNationalDay = new Holiday({
  name: 'Swiss National Day',
  month: 8,
  day: 1,
  daysOfWeek: WEEKDAYS,
})

/** Christmas Eve, observed on the date itself. */
export const EUChristmasEve = new Holiday({
  name: 'Christmas Eve',
  month: 12,
  day: 24,
})

/** Christmas, when it falls on a weekday. */
export const EUChristmas = new Holiday({
  name: 'Christmas',
  month: 12,
  day: 25,
  daysOfWeek: WEEKDAYS,
})

/** Boxing Day, observed on the date itself. */
export const EUBoxingDay = new Holiday({
  name: 'Boxing Day',
  month: 12,
  day: 26,
})

/** New Year's Eve, brought back to the Friday when it falls at a weekend. */
export const EUNewYearsEve = new Holiday({
  name: "New Year's Eve",
  month: 12,
  day: 31,
  observance: previousFriday,
})

/** Maundy Thursday: three days before Easter. */
export const MaundyThursday = new Holiday({
  name: 'Maundy Thursday',
  month: 1,
  day: 1,
  observance: easterOffset(-3),
})

/** The Wednesday before Easter, which Oslo closes early on. */
export const WednesdayBeforeEaster = new Holiday({
  name: 'Wednesday before Easter',
  month: 1,
  day: 1,
  observance: easterOffset(-4),
})

/** Norway's Constitution Day. */
export const NorwayConstitutionDay = new Holiday({
  name: 'Constitution Day',
  month: 5,
  day: 17,
})

/** Labour Day as Oslo keeps it, on the date itself. */
export const NorwayLabourDay = new Holiday({
  name: 'Labour Day',
  month: 5,
  day: 1,
})

/** Christmas Eve, when it falls on a weekday. */
export const EUChristmasEveWeekday = new Holiday({
  name: 'Christmas Eve',
  month: 12,
  day: 24,
  daysOfWeek: WEEKDAYS,
})

/** Boxing Day, when it falls on a weekday. */
export const EUBoxingDayWeekday = new Holiday({
  name: 'Boxing Day',
  month: 12,
  day: 26,
  daysOfWeek: WEEKDAYS,
})

/** New Year's Eve, when it falls on a weekday. */
export const EUNewYearsEveWeekday = new Holiday({
  name: "New Year's Eve",
  month: 12,
  day: 31,
  daysOfWeek: WEEKDAYS,
})

/** Oslo observes these on the date itself, whatever day it falls on. */
export const OSENewYearsDay = new Holiday({
  name: "New Year's Day",
  month: 1,
  day: 1,
})
export const OSEChristmasEve = new Holiday({
  name: 'Christmas Eve',
  month: 12,
  day: 24,
})
export const OSEChristmas = new Holiday({
  name: 'Christmas Day',
  month: 12,
  day: 25,
})
export const OSEBoxingDay = new Holiday({
  name: 'Boxing Day',
  month: 12,
  day: 26,
})
export const OSENewYearsEve = new Holiday({
  name: "New Year's Eve",
  month: 12,
  day: 31,
})
