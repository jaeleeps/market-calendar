import { MarketCalendar } from './core/MarketCalendar'
import { Registry } from './core/classRegistry'
import { NYSE } from './calendars/NYSE'
import { CMEBond, CMEEquity } from './calendars/CME'
import { CBOEEquityOptions, CBOEIndexOptions, CFE } from './calendars/CBOE'
import { IEX } from './calendars/IEX'
import { JPX } from './calendars/JPX'
import { LSE } from './calendars/LSE'
import { TSX } from './calendars/TSX'
import { ASX } from './calendars/ASX'
import { Forex } from './calendars/Forex'
import { ICE } from './calendars/ICE'
import { EUREX, EUREXBond, EUREXPrePost, OSE, SIX } from './calendars/europe'
import {
  CMEGlobexCrypto,
  CMEGlobexEnergyAndMetals,
  CMEGlobexEquities,
  CMEGlobexFX,
  CMEGlobexFixedIncome,
  CMEGlobexGrains,
  CMEGlobexLivestock,
} from './calendars/CMEGlobex'
import { SIFMAJP, SIFMAUK, SIFMAUS } from './calendars/SIFMA'
import { BMF } from './calendars/BMF'
import { TASE } from './calendars/TASE'
import { BSE, NSE } from './calendars/BSE'

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
registerCalendar(CFE)
registerCalendar(CBOEEquityOptions)
registerCalendar(CBOEIndexOptions)
registerCalendar(IEX)
registerCalendar(JPX)
registerCalendar(LSE)
registerCalendar(TSX)
registerCalendar(ASX)
registerCalendar(Forex)
registerCalendar(ICE)
registerCalendar(EUREX)
registerCalendar(EUREXBond)
registerCalendar(EUREXPrePost)
registerCalendar(OSE)
registerCalendar(SIX)
registerCalendar(CMEGlobexCrypto)
registerCalendar(CMEGlobexEnergyAndMetals)
registerCalendar(CMEGlobexEquities)
registerCalendar(CMEGlobexFX)
registerCalendar(CMEGlobexFixedIncome)
registerCalendar(CMEGlobexGrains)
registerCalendar(CMEGlobexLivestock)
registerCalendar(SIFMAJP)
registerCalendar(SIFMAUK)
registerCalendar(SIFMAUS)
registerCalendar(BMF)
registerCalendar(TASE)
registerCalendar(BSE)
registerCalendar(NSE)

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
