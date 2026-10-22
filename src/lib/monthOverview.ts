import type { ExpenseCategory, Movement } from '@/types/movements'
import { CATEGORY_META } from './categories'
import { formatMonthLong, monthDate } from './cashFlow'
import { todayIso } from './dates'
import { formatSoles } from './format'

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

/** yyyy-MM de hoy, en la zona del usuario. */
export function currentMonth(today: string = todayIso()): string {
  return today.slice(0, 7)
}

/** El mes de la URL si es valido y no es futuro; si no, el mes en curso. */
export function monthFromParam(raw: string | null, today: string = todayIso()): string {
  const now = currentMonth(today)
  return raw && MONTH.test(raw) && raw <= now ? raw : now
}

export function shiftMonth(month: string, delta: number): string {
  const date = monthDate(month)
  date.setMonth(date.getMonth() + delta)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function daysInMonth(month: string): number {
  const date = monthDate(month)
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

export function monthRange(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${month}-${String(daysInMonth(month)).padStart(2, '0')}` }
}

/** Casillas vacias antes del dia 1 en un calendario que empieza el lunes. */
export function leadingBlanks(month: string): number {
  return (monthDate(month).getDay() + 6) % 7
}

/** "2026-10" → "Octubre de 2026" */
export function formatMonthTitle(month: string): string {
  const name = formatMonthLong(month)
  return `${name[0].toUpperCase()}${name.slice(1)} de ${month.slice(0, 4)}`
}

export interface DaySummary {
  date: string
  spent: number
  earned: number
  movements: Movement[]
}

export interface CategoryTotal {
  category: ExpenseCategory
  total: number
  count: number
}

export interface MonthSummary {
  earned: number
  spent: number
  days: Map<string, DaySummary>
  /** De mayor a menor gasto. */
  categories: CategoryTotal[]
  priciestDay: DaySummary | undefined
}

const cents = (value: number) => Math.round(value * 100) / 100

export function summarizeMonth(movements: Movement[]): MonthSummary {
  const days = new Map<string, DaySummary>()
  const byCategory = new Map<ExpenseCategory, CategoryTotal>()
  let earned = 0
  let spent = 0

  for (const movement of movements) {
    const day = days.get(movement.date) ?? { date: movement.date, spent: 0, earned: 0, movements: [] }
    day.movements.push(movement)
    days.set(movement.date, day)
    if (movement.kind === 'INCOME') {
      day.earned = cents(day.earned + movement.amount)
      earned += movement.amount
      continue
    }
    day.spent = cents(day.spent + movement.amount)
    spent += movement.amount
    const category = movement.category ?? 'OTHER'
    const total = byCategory.get(category) ?? { category, total: 0, count: 0 }
    total.total = cents(total.total + movement.amount)
    total.count += 1
    byCategory.set(category, total)
  }

  const priciestDay = [...days.values()].reduce<DaySummary | undefined>(
    (best, day) => (day.spent > 0 && (!best || day.spent > best.spent) ? day : best),
    undefined,
  )
  return {
    earned: cents(earned),
    spent: cents(spent),
    days,
    categories: [...byCategory.values()].sort((a, b) => b.total - a.total),
    priciestDay,
  }
}

/** Cuanto pesa un movimiento en el mes que se esta mirando; fuera de ese mes no hay con que compararlo. */
export function movementInsight(movement: Movement, summary: MonthSummary, month: string): string | undefined {
  if (movement.date.slice(0, 7) !== month) return undefined
  const monthName = formatMonthLong(month)
  if (movement.kind === 'INCOME') {
    if (summary.spent === 0) return `En ${monthName} todavía no registras gastos.`
    return `Lo que gastaste en ${monthName} equivale al ${Math.round((summary.spent / movement.amount) * 100)} % de este ingreso.`
  }
  const category = movement.category ?? 'OTHER'
  const total = summary.categories.find((item) => item.category === category)
  if (!total) return undefined
  const count = total.count === 1 ? '1 gasto' : `${total.count} gastos`
  return `En ${monthName} llevas ${formatSoles(total.total)} en ${CATEGORY_META[category].label.toLowerCase()} (${count}).`
}
