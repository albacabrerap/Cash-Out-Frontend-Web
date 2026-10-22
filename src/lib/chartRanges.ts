import { parseIsoDate } from './dates'

export type ChartRange = '1M' | '3M' | '6M' | '1A' | '5A'

export const CHART_RANGES: { key: ChartRange; months: number; description: string }[] = [
  { key: '1M', months: 1, description: 'en el último mes' },
  { key: '3M', months: 3, description: 'en los últimos 3 meses' },
  { key: '6M', months: 6, description: 'en los últimos 6 meses' },
  { key: '1A', months: 12, description: 'en el último año' },
  { key: '5A', months: 60, description: 'en los últimos 5 años' },
]

/** "2026-10-02" − 3 meses → "2026-07-02". El dia 31 cae al ultimo dia del mes si no existe. */
export function addMonths(iso: string, months: number): string {
  const date = parseIsoDate(iso)
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** El rango se cuenta desde el ultimo cierre, no desde hoy: un fin de semana no achica el grafico. */
export function chartRangeStart(lastDate: string, range: ChartRange): string {
  const months = CHART_RANGES.find((r) => r.key === range)?.months ?? 3
  return addMonths(lastDate, -months)
}
