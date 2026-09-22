import { DateTime } from 'luxon'
import { Holiday } from '../core/Holiday'
import { sundayToMonday, weekdayOffset } from '../utils/rules'
import { Weekday } from '../utils/constants'
import {
  bsd_mapping,
  dbf_mapping,
  dnf_mapping,
  maf_mapping,
  sf_mapping,
  tsd_mapping,
} from './cn'
import { USNewYearsDay } from './us'

/**
 * Hong Kong holidays, as the HKEX observes them.
 *
 * Most hang off a lunar festival whose Gregorian date is listed in
 * `holidays/cn`, then shift: one that lands on a Sunday moves, and the
 * second and third days of a Spring Festival count from the first. Ported
 * from the reference implementation's `hkex` calendar module.
 */

/** How a holiday's date is arrived at once its starting point is known. */
interface Shift {
  /**
   * A year-to-date table to read the starting point from. Without one the
   * holiday starts from its own month and day.
   */
  mapping?: Record<number, string>
  /** Days after the starting point, for a multi-day holiday. */
  delta?: number
  /** Days to move by when the result lands on a Sunday. */
  sundayOffset?: number
  /** A further observance to apply afterwards. */
  then?: (dt: DateTime) => DateTime
}

/**
 * Build an observance that shifts a date the way Hong Kong's holidays do.
 *
 * @param shift - Where to start and how to move from there
 * @returns An observance, which declines a year its table does not cover
 */
const shiftedHoliday =
  ({ mapping, delta = 0, sundayOffset, then }: Shift) =>
  (dt: DateTime): DateTime | null => {
    let date = dt
    if (mapping) {
      const listed = mapping[dt.year]
      if (!listed) return null
      date = DateTime.fromISO(listed, { zone: 'utc' })
    }

    date = date.plus({ days: delta })
    if (sundayOffset && date.weekday === Weekday.SUNDAY) {
      date = date.plus({ days: sundayOffset })
    }
    return then ? then(date) : date
  }

/**
 * The Queen's Birthday, which Hong Kong moved about repeatedly.
 *
 * Before 1983 it fell in April, on the day itself or the Sunday after in two
 * years. From 1983 it moved to a Monday in June — usually the third, but the
 * second in four years and the fourth in one.
 */
function queensBirthday(dt: DateTime): DateTime {
  if (dt.year === 1974 || dt.year === 1981) {
    return weekdayOffset(Weekday.SUNDAY, 1)(dt)
  }
  if (dt.year < 1983) return sundayToMonday(dt)

  const week = [1983, 1988, 1993, 1994].includes(dt.year)
    ? 2
    : dt.year === 1985
      ? 4
      : 3
  return weekdayOffset(Weekday.MONDAY, week)(dt.startOf('month'))
}

/** Hong Kong keeps New Year's Day on the US rule. */
export const HKNewYearsDay = USNewYearsDay

/** Days the exchange shut that no rule describes. */
export const HKClosedDay: DateTime[] = [
  '1970-07-01',
  '1971-07-01',
  '1973-07-02',
  '1974-07-01',
  '1975-07-01',
  '1976-07-01',
  '1977-07-01',
  '1979-07-02',
  '1980-07-01',
  '1981-07-01',
  '1982-07-01',
  '1971-03-22',
  '1971-12-06',
  '1971-12-20',
  '1975-07-28',
  '1985-07-29',
  '1970-07-16',
  '1970-09-14',
  '1971-07-22',
  '1971-08-31',
  '1973-04-16',
  '1973-07-17',
  '1974-04-25',
  '1975-10-14',
  '1978-07-26',
  '1978-07-27',
  '1979-01-26',
  '1979-08-02',
  '1980-05-21',
  '1980-07-22',
  '1981-04-27',
  '1981-07-06',
  '1981-07-07',
  '1981-07-29',
  '1983-09-09',
  '1985-06-24',
  '1986-04-01',
  '1986-10-22',
  '1987-10-20',
  '1987-10-21',
  '1987-10-22',
  '1987-10-23',
  '1988-04-05',
  '1991-06-18',
  '1992-07-22',
  '1993-09-17',
  '1994-06-14',
  '1997-06-30',
  '1997-07-02',
  '1997-08-18',
  '1997-10-02',
  '1998-08-17',
  '1998-10-02',
  '1999-04-06',
  '1999-09-16',
  '1999-12-31',
  '2001-07-06',
  '2001-07-25',
  '2008-08-06',
  '2008-08-22',
  '2010-04-06',
  '2011-09-29',
  '2012-10-02',
  '2013-08-14',
  '2015-04-07',
  '2015-09-03',
  '2016-08-02',
  '2016-10-21',
  '2017-08-23',
  '2023-07-17',
  '2023-09-01',
  '2023-09-08',
].map((d) => DateTime.fromISO(d, { zone: 'utc' }))

export const SpringFestivalDayBefore1983 = new Holiday({
  name: 'Spring Festival',
  month: 1,
  day: 21,
  startDate: DateTime.utc(1961, 1, 1),
  endDate: DateTime.utc(1983, 1, 1),
  observance: shiftedHoliday({
    mapping: sf_mapping,
    delta: 0,
    sundayOffset: 3,
  }),
})

export const SpringFestivalDay2Before1983 = new Holiday({
  name: 'Spring Festival',
  month: 1,
  day: 21,
  startDate: DateTime.utc(1961, 1, 1),
  endDate: DateTime.utc(1983, 1, 1),
  observance: shiftedHoliday({
    mapping: sf_mapping,
    delta: 1,
    sundayOffset: 2,
  }),
})

export const SpringFestivalDay3Before1983 = new Holiday({
  name: 'Spring Festival',
  month: 1,
  day: 21,
  startDate: DateTime.utc(1961, 1, 1),
  endDate: DateTime.utc(1983, 1, 1),
  observance: shiftedHoliday({
    mapping: sf_mapping,
    delta: 2,
    sundayOffset: 1,
  }),
})

export const SpringFestivalDayBefore2010 = new Holiday({
  name: 'Spring Festival',
  month: 1,
  day: 21,
  startDate: DateTime.utc(1983, 1, 1),
  endDate: DateTime.utc(2010, 7, 1),
  observance: shiftedHoliday({
    mapping: sf_mapping,
    delta: 0,
    sundayOffset: -1,
  }),
})

export const SpringFestivalDay2Before2010 = new Holiday({
  name: 'Spring Festival',
  month: 1,
  day: 21,
  startDate: DateTime.utc(1983, 1, 1),
  endDate: DateTime.utc(2010, 7, 1),
  observance: shiftedHoliday({
    mapping: sf_mapping,
    delta: 1,
    sundayOffset: -2,
  }),
})

export const SpringFestivalDay3Before2010 = new Holiday({
  name: 'Spring Festival',
  month: 1,
  day: 21,
  startDate: DateTime.utc(1983, 1, 1),
  endDate: DateTime.utc(2010, 7, 1),
  observance: shiftedHoliday({
    mapping: sf_mapping,
    delta: 2,
    sundayOffset: -3,
  }),
})

export const SpringFestivalDay = new Holiday({
  name: 'Spring Festival',
  month: 1,
  day: 21,
  startDate: DateTime.utc(2010, 7, 1),
  observance: shiftedHoliday({
    mapping: sf_mapping,
    delta: 0,
    sundayOffset: 3,
  }),
})

export const SpringFestivalDay2 = new Holiday({
  name: 'Spring Festival',
  month: 1,
  day: 21,
  startDate: DateTime.utc(2010, 7, 1),
  observance: shiftedHoliday({
    mapping: sf_mapping,
    delta: 1,
    sundayOffset: 2,
  }),
})

export const SpringFestivalDay3 = new Holiday({
  name: 'Spring Festival',
  month: 1,
  day: 21,
  startDate: DateTime.utc(2010, 7, 1),
  observance: shiftedHoliday({
    mapping: sf_mapping,
    delta: 2,
    sundayOffset: 1,
  }),
})

export const TombSweepingDay = new Holiday({
  name: 'Tomb-sweeping Day',
  month: 4,
  day: 4,
  startDate: DateTime.utc(1961, 1, 1),
  observance: shiftedHoliday({ mapping: tsd_mapping, then: sundayToMonday }),
})

export const LabourDay = new Holiday({
  name: 'Labour Day',
  month: 5,
  day: 1,
  startDate: DateTime.utc(1999, 5, 1),
  observance: sundayToMonday,
})

export const BuddhaShakyamuniDay = new Holiday({
  name: 'Buddha Shakyamuni Day',
  month: 4,
  day: 28,
  startDate: DateTime.utc(1999, 4, 28),
  observance: shiftedHoliday({ mapping: bsd_mapping, then: sundayToMonday }),
})

export const DragonBoatFestivalDay = new Holiday({
  name: 'Dragon Boat Festival',
  month: 5,
  day: 27,
  startDate: DateTime.utc(1961, 1, 1),
  observance: shiftedHoliday({ mapping: dbf_mapping, then: sundayToMonday }),
})

export const HKRegionEstablishmentDay = new Holiday({
  name: 'Hong Kong Special Region Establishment Day',
  month: 7,
  day: 1,
  startDate: DateTime.utc(1997, 7, 1),
  observance: sundayToMonday,
})

export const MidAutumnFestivalDayBefore1983 = new Holiday({
  name: 'Mid-autumn Festival',
  month: 9,
  day: 7,
  startDate: DateTime.utc(1961, 1, 1),
  endDate: DateTime.utc(1983, 1, 1),
  observance: shiftedHoliday({
    mapping: maf_mapping,
    delta: 1,
    then: sundayToMonday,
  }),
})

export const MidAutumnFestivalDayBefore2010 = new Holiday({
  name: 'Mid-autumn Festival',
  month: 9,
  day: 7,
  startDate: DateTime.utc(1983, 1, 1),
  endDate: DateTime.utc(2010, 12, 31),
  observance: shiftedHoliday({
    mapping: maf_mapping,
    delta: 1,
    sundayOffset: -1,
  }),
})

export const MidAutumnFestivalDay = new Holiday({
  name: 'Mid-autumn Festival',
  month: 9,
  day: 7,
  startDate: DateTime.utc(2011, 1, 1),
  observance: shiftedHoliday({
    mapping: maf_mapping,
    delta: 1,
    then: sundayToMonday,
  }),
})

export const DoubleNinthFestivalDay = new Holiday({
  name: 'Double Ninth Festival',
  month: 10,
  day: 2,
  startDate: DateTime.utc(1961, 1, 1),
  observance: shiftedHoliday({ mapping: dnf_mapping, then: sundayToMonday }),
})

export const NationalDay = new Holiday({
  name: 'National Day',
  month: 10,
  day: 1,
  startDate: DateTime.utc(1997, 7, 1),
  observance: sundayToMonday,
})

export const Christmas = new Holiday({
  name: 'Christmas',
  month: 12,
  day: 25,
  startDate: DateTime.utc(1954, 1, 1),
  observance: shiftedHoliday({ sundayOffset: 2 }),
})

export const BoxingDay = new Holiday({
  name: 'Boxing day',
  month: 12,
  day: 26,
  startDate: DateTime.utc(1954, 1, 1),
  observance: sundayToMonday,
})

export const QueenBirthday = new Holiday({
  name: "Queen's Birthday",
  month: 6,
  day: 10,
  startDate: DateTime.utc(1983, 1, 1),
  endDate: DateTime.utc(1997, 6, 1),
  observance: queensBirthday,
})

export const QueenBirthday2 = new Holiday({
  name: "Queen's Birthday",
  month: 4,
  day: 21,
  startDate: DateTime.utc(1926, 4, 21),
  endDate: DateTime.utc(1983, 1, 1),
  observance: queensBirthday,
})

export const CommemoratingAlliedVictory = new Holiday({
  name: 'Commemorating the allied victory',
  month: 8,
  day: 20,
  startDate: DateTime.utc(1945, 8, 30),
  endDate: DateTime.utc(1997, 7, 1),
})

export const IDontKnow = new Holiday({
  name: 'I dont know these days, please tell me',
  month: 7,
  day: 31,
  startDate: DateTime.utc(1960, 8, 1),
  endDate: DateTime.utc(1983, 1, 1),
})
