import { DateTime } from 'luxon'
import { Holiday } from '../core/Holiday'
import { easterOffset } from '../utils/rules'
import { GoodFriday } from './us'
import { Weekday } from '../utils/constants'

/**
 * Brazilian holidays, as the B3 exchange observes them.
 *
 * Carnival is the movable feast: the Monday and Tuesday before Ash Wednesday,
 * forty-eight and forty-seven days before Easter. Several are municipal to
 * São Paulo and have since lapsed, so they carry an end date.
 *
 * Ported from the reference implementation's `bmf` calendar module.
 */

export const ConfUniversal = new Holiday({
  name: 'Dia da Confraternizacao Universal',
  month: 1,
  day: 1,
})

export const AniversarioSaoPaulo = new Holiday({
  name: 'Aniversario de Sao Paulo',
  month: 1,
  day: 25,
  endDate: DateTime.utc(2021, 12, 31),
})

export const CarnavalSegunda = new Holiday({
  name: 'Carnaval Segunda',
  month: 1,
  day: 1,
  observance: easterOffset(-48),
})

export const CarnavalTerca = new Holiday({
  name: 'Carnaval Terca',
  month: 1,
  day: 1,
  observance: easterOffset(-47),
})

export const QuartaCinzas = new Holiday({
  name: 'Quarta Cinzas',
  month: 1,
  day: 1,
  observance: easterOffset(-46),
})

export const CorpusChristi = new Holiday({
  name: 'Corpus Christi',
  month: 1,
  day: 1,
  observance: easterOffset(60),
})

export const Tiradentes = new Holiday({
  name: 'Tiradentes',
  month: 4,
  day: 21,
})

export const DiaTrabalho = new Holiday({
  name: 'Dia Trabalho',
  month: 5,
  day: 1,
})

export const Constitucionalista = new Holiday({
  name: 'Constitucionalista',
  month: 7,
  day: 9,
  startDate: DateTime.utc(1997, 1, 1),
  endDate: DateTime.utc(2019, 12, 31),
})

export const Independencia = new Holiday({
  name: 'Independencia',
  month: 9,
  day: 7,
})

export const Aparecida = new Holiday({
  name: 'Nossa Senhora de Aparecida',
  month: 10,
  day: 12,
})

export const Finados = new Holiday({
  name: 'Dia dos Finados',
  month: 11,
  day: 2,
})

export const ProclamacaoRepublica = new Holiday({
  name: 'Proclamacao da Republica',
  month: 11,
  day: 15,
})

export const ConscienciaNegra = new Holiday({
  name: 'Dia da Consciencia Negra',
  month: 11,
  day: 20,
  startDate: DateTime.utc(2004, 1, 1),
  endDate: DateTime.utc(2019, 12, 31),
})

export const ConscienciaNegraNacional = new Holiday({
  name: 'Dia da Consciencia Negra',
  month: 11,
  day: 20,
  startDate: DateTime.utc(2023, 12, 22),
})

export const VesperaNatal = new Holiday({
  name: 'Vespera Natal',
  month: 12,
  day: 24,
})

export const Natal = new Holiday({
  name: 'Natal',
  month: 12,
  day: 25,
})

export const AnoNovo = new Holiday({
  name: 'Ano Novo',
  month: 12,
  day: 31,
})

export const AnoNovoSabado = new Holiday({
  name: 'Ano Novo Sabado',
  month: 12,
  day: 30,
  daysOfWeek: [],
})

export const AnoNovoDomingo = new Holiday({
  name: 'Ano Novo Domingo',
  month: 12,
  day: 29,
  daysOfWeek: [],
})

/** Two 2021 holidays the exchange kept although the city had dropped them. */
/** Good Friday, which Brazil calls the Friday of the Passion. */
export const SextaPaixao = GoodFriday

export const Constitucionalista2021 = DateTime.utc(2021, 7, 9)
export const ConscienciaNegra2021 = DateTime.utc(2021, 11, 20)
