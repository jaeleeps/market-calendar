import { XNYS } from './calendars/XNYS'
import { ExchangeCalendar } from './calendars/base'

/**
 * Supported calendar instances mapped by ID.
 */
const CALENDARS: Record<string, () => ExchangeCalendar> = {
  XNYS: () => new XNYS(),
  NYSE: () => new XNYS(), // alias for readability
}

/**
 * Returns a new calendar instance for the given market code.
 *
 * @param name - Market code like "XNYS" or "NYSE"
 * @returns A concrete ExchangeCalendar instance
 * @throws Error if calendar name is not supported
 */
export function getCalendar(name: string): ExchangeCalendar {
  const key = name.toUpperCase()
  const factory = CALENDARS[key]
  if (!factory) {
    throw new Error(`Unknown market calendar: "${name}"`)
  }
  return factory()
}
