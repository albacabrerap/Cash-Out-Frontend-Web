import { formatChange } from './format'
import { betChips, clampBet, minBet } from './updown'

describe('updown', () => {
  it('el cambio va con signo y un decimal', () => {
    expect(formatChange(-11.1)).toBe('−11.1 %')
    expect(formatChange(33)).toBe('+33.0 %')
    expect(formatChange(0)).toBe('0.0 %')
  })

  it('la apuesta va de 10 a todos tus puntos', () => {
    expect(clampBet(5, 1000, 10)).toBe(10)
    expect(clampBet(1500, 1000, 10)).toBe(1000)
    expect(clampBet(254.6, 1000, 10)).toBe(255)
  })

  it('con menos de 10 puntos la minima es lo que queda', () => {
    expect(minBet(7, 10)).toBe(7)
    expect(clampBet(10, 7, 10)).toBe(7)
  })

  it('los atajos redondean a 10 y "Todo" es exacto', () => {
    expect(betChips(1235, 10).map((chip) => chip.value)).toEqual([120, 310, 620, 1235])
    expect(betChips(30, 10).map((chip) => chip.value)).toEqual([10, 10, 20, 30])
  })
})
