/**
 * Enum representing weekdays (1 = Monday, 7 = Sunday).
 */
export enum Weekday {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 7,
}

/**
 * Weekmask abbreviations for business day rules.
 */
export const WEEKMASK_ABBR: Record<string, string> = {
  MON: '1111100',
  TUE: '0111110',
  WED: '0011111',
  THU: '0001111',
  FRI: '0000111',
  MON_FRI: '1111100',
  TUE_SAT: '0111110',
}

/**
 * Default market configuration values.
 */
export const DEFAULT_TIMEZONE = 'America/New_York'
export const DEFAULT_OPEN_TIME = '09:30'
export const DEFAULT_CLOSE_TIME = '16:00'
