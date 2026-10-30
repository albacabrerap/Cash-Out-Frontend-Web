import type { PortfolioGamePlayer } from '@/types/portfolioGame'
import { adjustWeight, contributions, diversification, finalLesson } from './portfolioGame'

function player(id: number, name: string, value: number): PortfolioGamePlayer {
  return {
    id,
    rank: id,
    name,
    ready: true,
    weights: {},
    result: { value, returnPercent: 0, lastPercent: 0, risk: 1, score: 1 },
    me: false,
  }
}

describe('portfolioGame', () => {
  it('sumar no pasa del 100 % entre todos y restar no baja de 0', () => {
    expect(adjustWeight({ tech: 90 }, 'gold', 10)).toEqual({ tech: 90, gold: 10 })
    expect(adjustWeight({ tech: 100 }, 'gold', 10)).toEqual({ tech: 100, gold: 0 })
    expect(adjustWeight({ tech: 0 }, 'tech', -10)).toEqual({ tech: 0 })
  })

  it('lee el reparto: concentrado, apuesta fuerte, sin defensa o bien repartido', () => {
    expect(diversification({ tech: 70, small: 30 }).tone).toBe('risk')
    expect(diversification({ tech: 50, small: 30, energy: 20 }).tone).toBe('risk')
    expect(diversification({ tech: 40, small: 30, energy: 30 }).tone).toBe('warn')
    expect(diversification({ tech: 30, gold: 30, banks: 20, health: 20 }).tone).toBe('ok')
  })

  it('ordena lo que mas peso en la etapa, ganando o perdiendo', () => {
    const top = contributions({ tech: 50, gold: 30, bonds: 20 }, { tech: 2, gold: 10, bonds: -30 })
    expect(top.map((item) => [item.key, item.effect])).toEqual([
      ['bonds', -6],
      ['gold', 3],
      ['tech', 1],
    ])
  })

  it('el cierre distingue al que gano por puntaje del que termino con mas', () => {
    expect(finalLesson([player(1, 'Ana', 12_000), player(2, 'Beto', 11_000)])).toMatch(/^Ana ganó en rendimiento y en estabilidad/)
    expect(finalLesson([player(1, 'Ana', 11_000), player(2, 'Beto', 15_000)])).toMatch(/^Ganó Ana, aunque Beto terminó con más puntos/)
  })
})
