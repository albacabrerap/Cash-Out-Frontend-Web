import { formatMonthLong, formatMonthShort, isCashFlowRange, monthDate, monthsFor } from './cashFlow'

describe('cashFlow', () => {
  it('cada rango pide sus meses; este año cuenta desde enero', () => {
    const october = new Date(2026, 9, 19)
    expect(monthsFor('3M', october)).toBe(3)
    expect(monthsFor('6M', october)).toBe(6)
    expect(monthsFor('anio', october)).toBe(10)
    expect(monthsFor('anio', new Date(2026, 0, 5))).toBe(1)
  })

  it('solo acepta los rangos conocidos', () => {
    expect(isCashFlowRange('anio')).toBe(true)
    expect(isCashFlowRange('1A')).toBe(false)
    expect(isCashFlowRange(null)).toBe(false)
  })

  it('lee el mes en hora local, sin correrse al mes anterior', () => {
    const date = monthDate('2026-09')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(8)
    expect(date.getDate()).toBe(1)
  })

  it('nombra el mes corto y largo', () => {
    expect(formatMonthShort('2026-09')).toBe('set')
    expect(formatMonthLong('2026-09')).toBe('setiembre')
  })
})
