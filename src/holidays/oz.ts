import { DateTime } from 'luxon'
import { Holiday } from '../core/Holiday'
import {
  nextMondayOrTuesday,
  previousFriday,
  weekdayOffset,
  weekendToMonday,
} from '../utils/rules'
import { Weekday } from '../utils/constants'

/**
 * Australian holidays, as the Sydney exchange observes them.
 *
 * Ported from the reference implementation's `holidays/oz.py`.
 */

/** New Year's Day, moved to the Monday when it falls at a weekend. */
export const OZNewYearsDay = new Holiday({
  name: "New Year's Day",
  month: 1,
  day: 1,
  observance: weekendToMonday,
})

/** Australia Day, likewise. */
export const AustraliaDay = new Holiday({
  name: 'Australia Day',
  month: 1,
  day: 26,
  observance: weekendToMonday,
})

/** ANZAC Day, observed on the date itself whatever day it falls on. */
export const AnzacDay = new Holiday({
  name: 'ANZAC Day',
  month: 4,
  day: 25,
})

/** The Queen's Birthday: the second Monday of June. */
export const QueensBirthday = new Holiday({
  name: "Queen's Birthday",
  month: 6,
  day: 1,
  offset: weekdayOffset(Weekday.MONDAY, 2),
})

/** Christmas, moved to the Monday when it falls at a weekend. */
export const OZChristmas = new Holiday({
  name: 'Christmas',
  month: 12,
  day: 25,
  observance: weekendToMonday,
})

/** Boxing Day, which follows Christmas onto the next free weekday. */
export const OZBoxingDay = new Holiday({
  name: 'Boxing Day',
  month: 12,
  day: 26,
  observance: nextMondayOrTuesday,
})

/** Christmas Eve, brought back to the Friday when it falls at a weekend. */
export const OZChristmasEve = new Holiday({
  name: 'Christmas Eve',
  month: 12,
  day: 24,
  observance: previousFriday,
})

/** New Year's Eve, likewise. */
export const OZNewYearsEve = new Holiday({
  name: "New Year's Eve",
  month: 12,
  day: 31,
  observance: previousFriday,
})

/** The national day of mourning for Queen Elizabeth II. */
export const OZUniqueCloses = [DateTime.fromISO('2022-09-22', { zone: 'utc' })]
