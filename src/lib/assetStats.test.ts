import type { PricePoint } from '@/types/market'
import { addDays } from './dates'
import { changeOf, inRange, returnsByRange, yearStats } from './assetStats'
import { displayName } from './market'

// Cierres diarios corridos desde una fecha, con los valores dados.
const series = (start: string, values: number[]): PricePoint[] =>
  values.map((closePrice, i) => ({ date: addDays(start, i), closePrice }))

describe('assetStats', () => {
  it('el rango se cuenta desde el ultimo cierre', () => {
    const points = series('2026-08-01', Array.from({ length: 90 }, (_, i) => 100 + i))
    const month = inRange(points, '1M')
    expect(month[0].date).toBe(addDays(points.at(-1)!.date, -30))
    expect(changeOf(month)).toBeCloseTo(((189 - 159) / 159) * 100, 6)
  })

  it('un rango sin historia completa queda en null, salvo 5 anos', () => {
    const points = series('2026-07-01', Array.from({ length: 120 }, (_, i) => 100 + i))
    const returns = returnsByRange(points, points)
    expect(returns.find((r) => r.range === '1M')?.value).not.toBeNull()
    expect(returns.find((r) => r.range === '6M')?.value).toBeNull()
    expect(returns.find((r) => r.range === '1A')?.value).toBeNull()
    expect(returns.find((r) => r.range === '5A')?.value).not.toBeNull()
    expect(returns.find((r) => r.range === '1M')?.benchmark).toBe(returns.find((r) => r.range === '1M')?.value)
  })

  it('las cifras del ano: minimo, maximo, peor caida y distancia al maximo', () => {
    const values = [100, 120, 90, 110, 130, 117]
    const stats = yearStats(series('2026-10-01', values))!
    expect(stats.low).toBe(90)
    expect(stats.high).toBe(130)
    expect(stats.maxDrawdown).toBeCloseTo(-25, 6)
    expect(stats.fromHigh).toBeCloseTo(-10, 6)
    // Con tan pocos cierres la volatilidad anual no dice nada.
    expect(stats.volatility).toBeNull()
  })

  it('el precio de hoy cuenta para el rango del ano', () => {
    const stats = yearStats(series('2026-10-01', [100, 110]), 150)!
    expect(stats.high).toBe(150)
    expect(stats.fromHigh).toBe(0)
  })

  it('el titulo no lleva la clase de accion', () => {
    expect(displayName('Apple Inc. Common Stock')).toBe('Apple Inc.')
    expect(displayName('Maase Inc. Class A Ordinary Shares')).toBe('Maase Inc.')
    expect(displayName('SPDR S&P 500 ETF Trust')).toBe('SPDR S&P 500 ETF Trust')
  })
})
