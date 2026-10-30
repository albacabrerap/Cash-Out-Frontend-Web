import type { UpDownChoice } from '@/types/updown'

/** UpDownCaseResponse: un caso del banco de "¿Sube o baja?". */
export interface UpDownCase {
  id: number
  symbol: string
  /** El dia de la noticia, "2024-08-02". */
  cutoff: string
  /** La pista que se ve antes de revelar. */
  sector: string
  /** Lo que se revela al final. */
  name: string
  context: string
  lesson: string
  active: boolean
  /** El resultado real del mes siguiente, en %. */
  changePercent: number | null
  outcome: UpDownChoice | null
  timesPlayed: number
  /** Null si nunca salio en una partida. */
  lastPlayedAt: string | null
}

export type UpDownCaseInput = Pick<UpDownCase, 'symbol' | 'cutoff' | 'sector' | 'name' | 'context' | 'lesson' | 'active'>

/** Lo que paso de verdad, con los precios en 100 el dia de la noticia. */
export interface UpDownPreview {
  symbol: string
  cutoff: string
  past: number[]
  future: number[]
  changePercent: number
  outcome: UpDownChoice
}
