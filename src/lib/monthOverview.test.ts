import type { Movement } from '@/types/movements'
import {
  formatMonthTitle,
  leadingBlanks,
  monthFromParam,
  monthRange,
  movementInsight,
  shiftMonth,
  summarizeMonth,
} from './monthOverview'

function movement(overrides: Partial<Movement>): Movement {
  return {
    id: 1,
    kind: 'EXPENSE',
    label: 'Algo',
    category: 'FOOD',
    amount: 10,
    date: '2026-09-18',
    createdAt: '2026-09-18T15:00:00',
    ...overrides,
  }
}

const beca = movement({ id: 1, kind: 'INCOME', label: 'Beca', category: null, amount: 800, date: '2026-09-13' })
const menu = movement({ id: 2, category: 'FOOD', amount: 12.1, date: '2026-09-18' })
const taxi = movement({ id: 3, category: 'TRANSPORT', amount: 22.2, date: '2026-09-18' })
const super_ = movement({ id: 4, category: 'FOOD', amount: 30.3, date: '2026-09-20' })

describe('monthFromParam', () => {
  it('acepta un mes pasado o el actual', () => {
    expect(monthFromParam('2026-09', '2026-10-20')).toBe('2026-09')
    expect(monthFromParam('2026-10', '2026-10-20')).toBe('2026-10')
  })

  it('cae en el mes en curso si el de la URL es futuro o no es un mes', () => {
    expect(monthFromParam('2026-11', '2026-10-20')).toBe('2026-10')
    expect(monthFromParam('2026-13', '2026-10-20')).toBe('2026-10')
    expect(monthFromParam('setiembre', '2026-10-20')).toBe('2026-10')
    expect(monthFromParam(null, '2026-10-20')).toBe('2026-10')
  })
})

describe('calendario del mes', () => {
  it('cambia de mes cruzando el año', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('el rango va del primer al ultimo dia, con años bisiestos', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })

  it('cuenta las casillas vacias de una semana que empieza el lunes', () => {
    expect(leadingBlanks('2026-10')).toBe(3)
    expect(leadingBlanks('2026-06')).toBe(0)
    expect(leadingBlanks('2026-11')).toBe(6)
  })

  it('titula el mes como lo escribe es-PE', () => {
    expect(formatMonthTitle('2026-09')).toBe('Setiembre de 2026')
  })
})

describe('summarizeMonth', () => {
  const summary = summarizeMonth([beca, menu, taxi, super_])

  it('suma lo que entro y lo que se gasto, redondeado al centimo', () => {
    expect(summary.earned).toBe(800)
    expect(summary.spent).toBe(64.6)
  })

  it('agrupa por dia y marca el dia mas caro', () => {
    expect(summary.days.get('2026-09-18')).toMatchObject({ spent: 34.3, earned: 0 })
    expect(summary.days.get('2026-09-13')).toMatchObject({ spent: 0, earned: 800 })
    expect(summary.priciestDay?.date).toBe('2026-09-18')
  })

  it('ordena las categorias de mayor a menor y deja fuera los ingresos', () => {
    expect(summary.categories).toEqual([
      { category: 'FOOD', total: 42.4, count: 2 },
      { category: 'TRANSPORT', total: 22.2, count: 1 },
    ])
  })

  it('un mes sin gastos no tiene dia mas caro', () => {
    expect(summarizeMonth([beca]).priciestDay).toBeUndefined()
  })
})

describe('movementInsight', () => {
  const summary = summarizeMonth([beca, menu, taxi, super_])

  it('dice cuanto lleva el mes en la categoria del gasto', () => {
    expect(movementInsight(menu, summary, '2026-09')).toMatch(/^En setiembre llevas S\/\s42\.40 en comida \(2 gastos\)\.$/)
    expect(movementInsight(taxi, summary, '2026-09')).toMatch(/^En setiembre llevas S\/\s22\.20 en transporte \(1 gasto\)\.$/)
  })

  it('compara el gasto del mes con el ingreso', () => {
    expect(movementInsight(beca, summary, '2026-09')).toBe('Lo que gastaste en setiembre equivale al 8 % de este ingreso.')
    expect(movementInsight(beca, summarizeMonth([beca]), '2026-09')).toBe('En setiembre todavía no registras gastos.')
  })

  it('fuera del mes que se mira no compara', () => {
    expect(movementInsight(menu, summary, '2026-10')).toBeUndefined()
  })
})
