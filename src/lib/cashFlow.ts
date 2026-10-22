export type CashFlowRange = '3M' | '6M' | 'anio'

/** Los rangos de la maqueta: "Este año" va de enero al mes en curso. */
export const CASH_FLOW_RANGES: { key: CashFlowRange; label: string; description: string }[] = [
  { key: '3M', label: '3M', description: 'Últimos 3 meses' },
  { key: '6M', label: '6M', description: 'Últimos 6 meses' },
  { key: 'anio', label: 'Este año', description: 'Desde enero' },
]

export const DEFAULT_CASH_FLOW_RANGE: CashFlowRange = '6M'

export function isCashFlowRange(value: string | null): value is CashFlowRange {
  return CASH_FLOW_RANGES.some((r) => r.key === value)
}

/** Meses que se piden al backend, contando el que esta en curso. */
export function monthsFor(range: CashFlowRange, today: Date = new Date()): number {
  if (range === 'anio') return monthsThisYear(today)
  return range === '3M' ? 3 : 6
}

/** De enero al mes en curso. */
export function monthsThisYear(today: Date = new Date()): number {
  return today.getMonth() + 1
}

/** "2026-09" → 1 de septiembre de 2026, en hora local. */
export function monthDate(month: string): Date {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m - 1, 1)
}

const shortMonth = new Intl.DateTimeFormat('es-PE', { month: 'short' })
const longMonth = new Intl.DateTimeFormat('es-PE', { month: 'long' })

/** "2026-09" → "set" (el es-PE escribe "Set.") */
export function formatMonthShort(month: string): string {
  return shortMonth.format(monthDate(month)).replace('.', '').toLowerCase()
}

/** "2026-09" → "setiembre" */
export function formatMonthLong(month: string): string {
  return longMonth.format(monthDate(month)).toLowerCase()
}
