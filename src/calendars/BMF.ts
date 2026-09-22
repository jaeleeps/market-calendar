import { MarketCalendar, TimeOfDay } from '../core/MarketCalendar'
import { HolidayCalendar } from '../core/HolidayCalendar'
import { ProtectedDict } from '../core/classRegistry'
import { Dated } from '../utils/dated'
import * as br from '../holidays/br'

/**
 * B3, the Brazilian exchange, formerly BM&F Bovespa.
 *
 * Carnival shuts it for the Monday and Tuesday before Ash Wednesday, and
 * Corpus Christi for a Thursday sixty days after Easter. Several of its
 * holidays are municipal to São Paulo and have since lapsed.
 */
export class BMF extends MarketCalendar {
  static override aliases = ['BMF', 'B3', 'BVMF']

  readonly name = 'BMF'
  readonly tz = 'America/Sao_Paulo'

  override regularMarketTimes = new ProtectedDict<Dated<TimeOfDay | null>[]>([
    ['market_open', [{ from: null, value: [10, 0] }]],
    ['market_close', [{ from: null, value: [17, 0] }]],
  ])

  override regularHolidays = new HolidayCalendar([
    br.ConfUniversal,
    br.AniversarioSaoPaulo,
    br.CarnavalSegunda,
    br.CarnavalTerca,
    br.SextaPaixao,
    br.CorpusChristi,
    br.Tiradentes,
    br.DiaTrabalho,
    br.Constitucionalista,
    br.Independencia,
    br.Aparecida,
    br.Finados,
    br.ProclamacaoRepublica,
    br.ConscienciaNegra,
    br.ConscienciaNegraNacional,
    br.VesperaNatal,
    br.Natal,
    br.AnoNovo,
    br.AnoNovoSabado,
    br.AnoNovoDomingo,
  ])

  override adhocHolidays = [br.Constitucionalista2021, br.ConscienciaNegra2021]
}
