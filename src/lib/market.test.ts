import { addMonths, chartRangeStart } from './chartRanges'
import {
  formatAxisUsd,
  formatSignedPercent,
  formatUsd,
  quantityField,
  quantityToTokens,
  returnPercent,
  tokensToQuantity,
} from './market'

describe('fichas y acciones', () => {
  it('con 100 fichas a US$ 333.75 se compran 0.299625 acciones', () => {
    expect(tokensToQuantity(100, 333.75)).toBe(0.299625)
    expect(quantityToTokens(0.299625, 333.75)).toBe(100)
  })

  it('la cantidad se trunca: el costo nunca supera lo que se quiso gastar', () => {
    const prices = [333.75, 769.72, 0.4321, 12.5, 1999.99, 3.3333]
    const amounts = [0.01, 1, 5.55, 100, 999.99]
    for (const price of prices) {
      for (const amount of amounts) {
        const cost = quantityToTokens(tokensToQuantity(amount, price), price)
        expect(cost).toBeLessThanOrEqual(amount)
      }
    }
  })

  it('sin precio no hay cantidad', () => {
    expect(tokensToQuantity(100, 0)).toBe(0)
  })

  it('el rendimiento es sobre lo invertido', () => {
    expect(returnPercent(10, 200)).toBe(5)
    expect(returnPercent(null, 200)).toBeNull()
    expect(returnPercent(10, 0)).toBeNull()
  })
})

describe('formato', () => {
  it('dolares con 2 decimales, o 4 si vale menos de un dolar', () => {
    expect(formatUsd(333.75)).toBe('US$ 333.75')
    expect(formatUsd(0.4321)).toBe('US$ 0.4321')
    expect(formatUsd(null)).toBe('—')
  })

  it('el eje del grafico usa etiquetas cortas', () => {
    expect(formatAxisUsd(350)).toBe('$350')
    expect(formatAxisUsd(12.5)).toBe('$12.50')
  })

  it('porcentajes con signo', () => {
    expect(formatSignedPercent(1.0017)).toBe('+1.00 %')
    expect(formatSignedPercent(-2.5)).toBe('−2.50 %')
    expect(formatSignedPercent(0)).toBe('0.00 %')
  })
})

describe('quantityField', () => {
  it('acepta hasta 6 decimales y coma decimal', () => {
    expect(quantityField.parse('0,299625')).toBe(0.299625)
    expect(quantityField.safeParse('0.1234567').success).toBe(false)
    expect(quantityField.safeParse('0').success).toBe(false)
  })
})

describe('rangos del grafico', () => {
  it('restar meses respeta el fin de mes', () => {
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
    expect(addMonths('2026-10-02', -3)).toBe('2026-07-02')
    expect(addMonths('2026-01-15', -12)).toBe('2025-01-15')
  })

  it('el rango se cuenta desde el ultimo cierre', () => {
    expect(chartRangeStart('2026-10-02', '6M')).toBe('2026-04-02')
    expect(chartRangeStart('2026-10-02', '5A')).toBe('2021-10-02')
  })
})
