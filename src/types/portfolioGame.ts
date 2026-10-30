export type PortfolioGamePhase = 'LOBBY' | 'RUNNING' | 'FINISHED' | 'CANCELLED'

/** Reparto en %, por clave de sector ("tech", "gold"…). */
export type Weights = Record<string, number>

export interface PortfolioSector {
  key: string
  name: string
  /** El ETF que sigue al sector, como XLK. */
  symbol: string
  kind: string
  description: string
}

export interface PortfolioStage {
  number: number
  revealed: boolean
  /** "primer semestre de 2022"; null hasta revelarla. */
  period: string | null
  title: string | null
  lesson: string | null
  /** Retorno de cada sector en %; null hasta revelarla. */
  returns: Record<string, number> | null
  benchmarkReturn: number | null
}

export interface PortfolioResult {
  value: number
  returnPercent: number
  /** El retorno de la ultima etapa revelada. */
  lastPercent: number
  /** Null con menos de dos etapas: con una no hay riesgo que medir. */
  risk: number | null
  score: number | null
}

export interface PortfolioGamePlayer {
  /** El del jugador en la sala: dos jugadores pueden llamarse igual. */
  id: number
  rank: number
  name: string
  ready: boolean
  /** El de los demas solo llega cuando empieza la simulacion. */
  weights: Weights | null
  result: PortfolioResult | null
  me: boolean
}

/** PortfolioGameView */
export interface PortfolioGameView {
  code: string
  phase: PortfolioGamePhase
  host: boolean
  joined: boolean
  maxPlayers: number
  startValue: number
  /** Etapas reveladas, de 0 a totalSteps. */
  step: number
  totalSteps: number
  sectors: PortfolioSector[]
  stages: PortfolioStage[]
  ranking: PortfolioGamePlayer[]
  me: PortfolioGamePlayer | null
  /** Todo en el S&P 500, como referencia; null antes de empezar. */
  benchmark: PortfolioResult | null
}
