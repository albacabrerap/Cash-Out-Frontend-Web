import {
  formatTerm,
  goalReach,
  paramsSummary,
  projectionCurve,
  projectionParamsSchema,
  projectionToFields,
  sameParams,
  yearlyBreakdown,
} from './projections'

const valid = { initialCapital: '500', monthlyContribution: '120', annualRatePercent: '7.5', periods: '24' }

function errorFor(field: keyof typeof valid, value: string) {
  const result = projectionParamsSchema.safeParse({ ...valid, [field]: value })
  return result.success ? undefined : result.error.issues[0].message
}

describe('projectionParamsSchema', () => {
  it('pasa la TEA de porcentaje a tasa sin restos de punto flotante', () => {
    expect(projectionParamsSchema.parse({ ...valid, annualRatePercent: '1,1' })).toEqual({
      initialCapital: 500,
      monthlyContribution: 120,
      annualRate: 0.011,
      periods: 24,
    })
    expect(projectionParamsSchema.parse({ ...valid, annualRatePercent: '12.3456' }).annualRate).toBe(0.123456)
  })

  it('admite capital y aporte en cero, y coma decimal', () => {
    expect(projectionParamsSchema.parse({ ...valid, initialCapital: '0', monthlyContribution: '25,5' })).toMatchObject({
      initialCapital: 0,
      monthlyContribution: 25.5,
    })
  })

  it('replica los limites del backend', () => {
    expect(errorFor('annualRatePercent', '100')).toBeUndefined()
    expect(errorFor('annualRatePercent', '100.5')).toBe('La TEA no puede pasar de 100 %.')
    expect(errorFor('annualRatePercent', '7.12345')).toBe('Escribe la TEA con hasta 4 decimales, como 7.5.')
    expect(errorFor('periods', '600')).toBeUndefined()
    expect(errorFor('periods', '601')).toBe('El plazo va de 1 a 600 meses (50 años).')
    expect(errorFor('periods', '0')).toBe('El plazo va de 1 a 600 meses (50 años).')
    expect(errorFor('periods', '12.5')).toBe('El plazo es un número entero de meses.')
    expect(errorFor('initialCapital', '')).toBe('Ingresa el monto; puede ser 0.')
    expect(errorFor('initialCapital', '-5')).toBe('Escribe un monto con hasta 2 decimales, como 25.50.')
  })
})

describe('formatTerm', () => {
  it('expresa el plazo en anios y meses', () => {
    expect(formatTerm(1)).toBe('1 mes')
    expect(formatTerm(11)).toBe('11 meses')
    expect(formatTerm(12)).toBe('1 año')
    expect(formatTerm(13)).toBe('1 año y 1 mes')
    expect(formatTerm(30)).toBe('2 años y 6 meses')
    expect(formatTerm(600)).toBe('50 años')
  })
})

describe('escenarios guardados', () => {
  const projection = { initialCapital: 1000, monthlyContribution: 0, annualRate: 0.075, periods: 18 }

  it('vuelven a la calculadora como los escribiria el usuario', () => {
    expect(projectionToFields(projection)).toEqual({
      initialCapital: '1000.00',
      monthlyContribution: '0.00',
      annualRatePercent: '7.5',
      periods: '18',
    })
  })

  it('se resumen en una linea, sin aporte si es cero', () => {
    expect(paramsSummary(projection)).toMatch(/^S\/\s?1,000\.00 · TEA 7\.5 % · 1 año y 6 meses$/)
    expect(paramsSummary({ ...projection, monthlyContribution: 120 })).toMatch(/\+ S\/\s?120\.00 al mes/)
  })
})

describe('projectionCurve', () => {
  it('termina en los mismos montos que calcula el backend', () => {
    const curve = projectionCurve({ initialCapital: 1000, monthlyContribution: 0, annualRate: 0.1, periods: 12 })
    const last = curve[12]
    expect(curve).toHaveLength(13)
    expect(last.compound).toBeCloseTo(1100, 6)
    expect(last.simple).toBeCloseTo(1095.69, 2)
    expect(last.contributed).toBe(1000)
  })

  it('con tasa cero solo suma lo aportado', () => {
    const curve = projectionCurve({ initialCapital: 100, monthlyContribution: 50, annualRate: 0, periods: 3 })
    expect(curve.map((point) => point.compound)).toEqual([100, 150, 200, 250])
  })
})

describe('yearlyBreakdown', () => {
  it('corta en años y el ultimo puede ser parcial', () => {
    const years = yearlyBreakdown(projectionCurve({ initialCapital: 500, monthlyContribution: 100, annualRate: 0.08, periods: 30 }))
    expect(years.map((year) => [year.year, year.months, year.contributed])).toEqual([
      [1, 12, 1700],
      [2, 12, 2900],
      [3, 6, 3500],
    ])
    expect(years[1].interest).toBeGreaterThan(years[0].interest)
    expect(years[2].total).toBeCloseTo(3500 + years.reduce((sum, year) => sum + year.interest, 0), 6)
  })
})

describe('goalReach', () => {
  const params = { initialCapital: 1000, monthlyContribution: 150, annualRate: 0.08, periods: 48 }

  it('dice en que mes se llega y cuanto aportar para llegar al plazo', () => {
    const { reachMonth, needed } = goalReach(params, 2400, 5)
    expect(reachMonth).toBe(9)
    expect(needed).toBeGreaterThan(150)
    expect(goalReach({ ...params, monthlyContribution: needed }, 2400, 5).reachMonth).toBeLessThanOrEqual(5)
  })

  it('si el capital ya alcanza, llega en el mes 0 sin aportar', () => {
    expect(goalReach(params, 600, 8)).toEqual({ reachMonth: 0, needed: 0 })
  })
})

describe('sameParams', () => {
  it('compara montos en centimos', () => {
    const a = { initialCapital: 0.1 + 0.2, monthlyContribution: 120, annualRate: 0.075, periods: 24 }
    expect(sameParams(a, { ...a, initialCapital: 0.3 })).toBe(true)
    expect(sameParams(a, { ...a, periods: 25 })).toBe(false)
  })
})
