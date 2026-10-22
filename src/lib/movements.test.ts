import type { Expense, Income } from '@/types/movements'
import { expenseToMovement, formatDayMonth, formatLongDate, incomeToMovement } from './movements'

describe('formatos de fecha de la lista', () => {
  it('muestra dia y mes, y el año solo si no es el actual', () => {
    expect(formatDayMonth('2026-09-03', '2026-10-20')).toBe('3 set')
    expect(formatDayMonth('2025-12-24', '2026-10-20')).toBe('24 dic 2025')
  })

  it('escribe la fecha completa con el dia de la semana', () => {
    expect(formatLongDate('2026-10-19')).toBe('lunes, 19 de octubre de 2026')
  })
})

describe('filas de gastos e ingresos', () => {
  it('un gasto lleva su descripcion y categoria', () => {
    const expense: Expense = {
      id: 7,
      category: 'FOOD',
      amount: 25.5,
      date: '2026-09-30',
      description: 'Almuerzo',
      createdAt: '2026-09-30T17:00:00',
    }
    expect(expenseToMovement(expense)).toEqual({
      id: 7,
      kind: 'EXPENSE',
      label: 'Almuerzo',
      category: 'FOOD',
      amount: 25.5,
      date: '2026-09-30',
      createdAt: '2026-09-30T17:00:00',
    })
  })

  it('un ingreso se nombra por su origen y no tiene categoria', () => {
    const income: Income = {
      id: 3,
      amount: 800,
      source: 'Beca',
      date: '2026-09-28',
      description: 'De la universidad',
      createdAt: '2026-09-28T15:00:00',
    }
    expect(incomeToMovement(income)).toMatchObject({ id: 3, kind: 'INCOME', label: 'Beca', category: null })
  })
})
