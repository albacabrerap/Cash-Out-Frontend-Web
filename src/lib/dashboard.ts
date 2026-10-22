import { parseIsoDate } from '@/lib/dates'
import { parseServerDateTime } from '@/lib/format'
import type { TokenTransaction } from '@/types/finance'
import type { SavingsGoal } from '@/types/goals'
import type { Position, PricePoint } from '@/types/market'
import type { MonthlyFlow, MonthlyFlows } from '@/types/movements'

const DAY = 86_400_000
const MONTH = 30.44 * DAY
// Ir unos dias detras del calendario no es estar atrasado.
const PACE_SLACK = 0.05

export interface GoalPace {
  /** Parte del plazo que ya paso, de 0 a 1. */
  elapsed: number
  /** Parte del monto ya ahorrada, de 0 a 1. */
  progress: number
  late: boolean
  /** Lo que falta juntar. */
  remaining: number
  /** Lo que falta apartar cada mes para llegar a la fecha. */
  perMonth: number
  /** Vence en menos de un mes: ya no tiene sentido hablar de "al mes". */
  dueSoon: boolean
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/** El avance de una meta frente al tiempo que paso desde que se creo. */
export function goalPace(goal: SavingsGoal, now: Date = new Date()): GoalPace {
  const start = parseServerDateTime(goal.createdAt).getTime()
  // La fecha limite cuenta entera: el plazo vence al terminar ese dia.
  const end = parseIsoDate(goal.deadline).getTime() + DAY
  const elapsed = clamp((now.getTime() - start) / Math.max(end - start, DAY))
  const progress = clamp(goal.accumulatedAmount / goal.targetAmount)
  const remaining = Math.max(goal.targetAmount - goal.accumulatedAmount, 0)
  const left = end - now.getTime()
  return {
    elapsed,
    progress,
    late: progress < elapsed - PACE_SLACK,
    remaining,
    perMonth: Math.ceil(remaining / Math.max(left / MONTH, 1)),
    dueSoon: left < MONTH,
  }
}

/** Cuanto de lo que entro se guardo, en %; null sin ingresos, porque no hay nada que medir. */
export function savingsRate(flows: Pick<MonthlyFlows, 'totalIncome' | 'totalNet'>): number | null {
  if (flows.totalIncome <= 0) return null
  return (flows.totalNet / flows.totalIncome) * 100
}

export interface SavingsBeam {
  month: string
  net: number
  x: number
  y: number
}

/** Un haz por mes en un lienzo de 700 x 200: mas largo cuanto mas se ahorro; un mes en rojo queda corto. */
export function savingsBeams(months: readonly MonthlyFlow[]): SavingsBeam[] {
  const top = Math.max(1, ...months.map((m) => m.net))
  const step = months.length > 1 ? 180 / (months.length - 1) : 0
  return months.map((m, i) => ({
    month: m.month,
    net: m.net,
    x: m.net > 0 ? 90 + (m.net / top) * 440 : 34,
    y: months.length > 1 ? 10 + i * step : 100,
  }))
}

export interface AllocationSlice {
  label: string
  name: string
  value: number
  share: number
}

/** Como se reparte el portafolio: las tres posiciones mas grandes y el resto junto. */
export function portfolioAllocation(positions: readonly Position[]): AllocationSlice[] {
  const valued = positions
    .filter((p) => (p.marketValue ?? 0) > 0)
    .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
  const total = valued.reduce((sum, p) => sum + (p.marketValue ?? 0), 0)
  if (total === 0) return []
  const slices = valued.slice(0, 3).map((p) => ({ label: p.symbol, name: p.assetName, value: p.marketValue ?? 0 }))
  const rest = valued.slice(3).reduce((sum, p) => sum + (p.marketValue ?? 0), 0)
  if (rest > 0) slices.push({ label: 'Otros', name: `${valued.length - 3} posiciones`, value: rest })
  return slices.map((slice) => ({ ...slice, share: slice.value / total }))
}

/** Variacion en % entre el primer cierre desde `from` y el ultimo; null si todavia no hay dos cierres. */
export function changeSince(points: readonly PricePoint[], from: string): number | null {
  const start = points.find((p) => p.date >= from)
  const last = points.at(-1)
  if (!start || !last || start === last || start.closePrice <= 0) return null
  return ((last.closePrice - start.closePrice) / start.closePrice) * 100
}

/** Que fue un movimiento de fichas, en palabras. */
export function tokenMoveLabel(move: Pick<TokenTransaction, 'reason' | 'amount'>): string {
  const incoming = move.amount > 0
  switch (move.reason) {
    case 'INVESTMENT':
      return incoming ? 'Venta en el mercado' : 'Compra en el mercado'
    case 'MINIGAME':
      return incoming ? 'Premio de minijuego' : 'Partida de minijuego'
    case 'RACE_ENTRY':
      return 'Entrada a una carrera'
    case 'RACE_PRIZE':
      return 'Premio de la carrera'
    case 'RACE_REFUND':
      return 'Carrera cancelada'
    case 'GOAL_COMPLETED':
      return 'Meta cumplida'
    case 'ADJUSTMENT':
      return 'Ajuste de saldo'
  }
}
