import { chartRangeStart, CHART_RANGES, type ChartRange } from '@/lib/chartRanges'
import type { PricePoint } from '@/types/market'

/** Los cierres del rango, contado desde el ultimo cierre. */
export function inRange(points: readonly PricePoint[], range: ChartRange): PricePoint[] {
  const last = points.at(-1)
  if (!last) return []
  const start = chartRangeStart(last.date, range)
  return points.filter((point) => point.date >= start)
}

/** Variacion en % entre el primer y el ultimo cierre; null con menos de dos. */
export function changeOf(points: readonly PricePoint[]): number | null {
  const first = points[0]?.closePrice
  const last = points.at(-1)?.closePrice
  return points.length > 1 && first ? ((last! - first) / first) * 100 : null
}

export interface RangeReturn {
  range: ChartRange
  value: number | null
  /** El mismo rango del indice de referencia (S&P 500), si se tiene. */
  benchmark: number | null
}

/** Cuanto rindio en cada rango; un rango sin historia suficiente queda en null. */
export function returnsByRange(points: readonly PricePoint[], benchmark?: readonly PricePoint[]): RangeReturn[] {
  const firstDate = points[0]?.date
  return CHART_RANGES.map(({ key }) => {
    const slice = inRange(points, key)
    // Si el historial empieza despues del inicio del rango, la cifra seria de un periodo mas corto.
    const complete = firstDate !== undefined && slice[0]?.date !== firstDate
    return {
      range: key,
      value: complete || key === '5A' ? changeOf(slice) : null,
      benchmark: benchmark ? changeOf(inRange(benchmark, key)) : null,
    }
  })
}

export interface YearStats {
  low: number
  high: number
  /** Desviacion de los retornos diarios llevada a un ano, en %. */
  volatility: number | null
  /** La mayor caida desde un maximo dentro del ano, en % (negativa). */
  maxDrawdown: number
  /** Cuanto falta para volver al maximo del ano, en % (0 o negativa). */
  fromHigh: number
}

const TRADING_DAYS = 252

export function yearStats(points: readonly PricePoint[], price?: number): YearStats | null {
  const year = inRange(points, '1A').map((point) => point.closePrice)
  if (year.length < 2) return null
  const current = price ?? year.at(-1)!
  const low = Math.min(...year, current)
  const high = Math.max(...year, current)

  const returns = year.slice(1).map((value, i) => Math.log(value / year[i]))
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / Math.max(1, returns.length - 1)
  const volatility = returns.length > 20 ? Math.sqrt(variance) * Math.sqrt(TRADING_DAYS) * 100 : null

  let peak = year[0]
  let maxDrawdown = 0
  for (const value of year) {
    peak = Math.max(peak, value)
    maxDrawdown = Math.min(maxDrawdown, (value / peak - 1) * 100)
  }
  return { low, high, volatility, maxDrawdown, fromHigh: (current / high - 1) * 100 }
}
