import { MarketCalendar } from './core/MarketCalendar'
import { Registry } from './core/classRegistry'
import { NYSE } from './calendars/NYSE'
import { CMEBond, CMEEquity } from './calendars/CME'

const registry = new Registry<MarketCalendar>()

/**
 * Register a calendar under its name and declared aliases.
 *
 * @param klass - A concrete MarketCalendar subclass
 */
export function registerCalendar(
  klass: (new () => MarketCalendar) & { aliases: string[] },
): void {
  const [name, ...aliases] = klass.aliases.length ? klass.aliases : [klass.name]
  registry.register(name, klass, aliases)
}

registerCalendar(NYSE)
registerCalendar(CMEEquity)
registerCalendar(CMEBond)

/**
 * Returns a new calendar instance for the given market code.
 *
 * @param name - Market code like "XNYS" or "NYSE"
 * @returns A concrete MarketCalendar instance
 * @throws Error if the calendar name is not registered
 */
export function getCalendar(name: string): MarketCalendar {
  return registry.create(name)
}

/**
 * Lists every registered calendar name and alias.
 *
 * @returns An array of names accepted by `getCalendar`
 */
export function calendarNames(): string[] {
  return registry.listNames()
}
