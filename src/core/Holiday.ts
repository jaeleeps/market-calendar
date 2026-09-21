import { DateTime } from 'luxon'

export interface HolidayConfig {
  name: string
  month?: number
  day?: number | number[]
  staticDates?: DateTime[] // for adhoc dates like Paperwork Crisis, 9/11, etc.
  startDate?: DateTime
  endDate?: DateTime
  daysOfWeek?: number[]
  observance?: (dt: DateTime) => DateTime | null
  offset?: ((dt: DateTime) => DateTime) | ((dt: DateTime) => DateTime)[]
}

export class Holiday {
  name: string
  month?: number
  day?: number | number[]
  staticDates?: DateTime[]
  startDate?: DateTime
  endDate?: DateTime
  daysOfWeek?: number[]
  observance?: (dt: DateTime) => DateTime | null
  offset?: ((dt: DateTime) => DateTime) | ((dt: DateTime) => DateTime)[]

  constructor(config: HolidayConfig) {
    this.name = config.name
    this.month = config.month
    this.day = config.day
    this.staticDates = config.staticDates
    this.startDate = config.startDate
    this.endDate = config.endDate
    this.daysOfWeek = config.daysOfWeek
    this.observance = config.observance
    this.offset = config.offset
  }

  /**
   * Calculate holiday for a given year.
   * For static dates, returns all matching instances from the list.
   */
  getDate(year: number): DateTime[] {
    const result: DateTime[] = []

    // Handle staticDates first
    if (this.staticDates) {
      for (const dt of this.staticDates) {
        if (dt.year === year) {
          result.push(dt)
        }
      }
      return result
    }

    if (!this.day || !this.month) return []

    const days = Array.isArray(this.day) ? this.day : [this.day]

    for (const d of days) {
      let dt = DateTime.utc(year, this.month, d)

      if (this.observance) {
        // An observance may decline the year outright, which is how a rule
        // that holds in most years but not all says so.
        const observed = this.observance(dt)
        if (observed === null) continue
        dt = observed
      }
      if (this.offset) {
        const offsets = Array.isArray(this.offset) ? this.offset : [this.offset]
        for (const off of offsets) {
          dt = off(dt)
        }
      }

      if (this.startDate && dt < this.startDate) continue
      if (this.endDate && dt > this.endDate) continue
      if (this.daysOfWeek && !this.daysOfWeek.includes(dt.weekday)) continue

      result.push(dt)
    }

    return result
  }
}
