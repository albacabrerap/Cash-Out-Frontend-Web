import type { Expense, Income, Movement } from '@/types/movements'
import { parseIsoDate, todayIso } from './dates'

/** Gastos e ingresos se listan con la misma forma que el listado unificado. */
export function expenseToMovement(expense: Expense): Movement {
  return {
    id: expense.id,
    kind: 'EXPENSE',
    label: expense.description,
    category: expense.category,
    amount: expense.amount,
    date: expense.date,
    createdAt: expense.createdAt,
  }
}

export function incomeToMovement(income: Income): Movement {
  return {
    id: income.id,
    kind: 'INCOME',
    label: income.source,
    category: null,
    amount: income.amount,
    date: income.date,
    createdAt: income.createdAt,
  }
}

const dayMonth = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' })
const longDate = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** "2026-10-19" → "19 oct"; si es de otro año, "19 oct 2025". */
export function formatDayMonth(iso: string, today: string = todayIso()): string {
  const text = dayMonth.format(parseIsoDate(iso)).replace('.', '')
  return iso.slice(0, 4) === today.slice(0, 4) ? text : `${text} ${iso.slice(0, 4)}`
}

/** "2026-10-19" → "lunes, 19 de octubre de 2026" */
export function formatLongDate(iso: string): string {
  return longDate.format(parseIsoDate(iso))
}
