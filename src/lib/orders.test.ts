import type { TradeOrder } from '@/types/market'
import { dayTitle, groupByDay, inPeriod, matchesKind, newestFirst, orderMetrics, signedTokens } from './orders'

const order = (id: number, createdAt: string, overrides: Partial<TradeOrder> = {}): TradeOrder => ({
  id,
  assetId: 1,
  symbol: 'AAPL',
  side: 'BUY',
  quantity: 1,
  status: 'EXECUTED',
  executionPrice: 100,
  tokensMoved: 100,
  tokenRate: 1,
  rejectionReason: null,
  createdAt,
  executedAt: createdAt,
  ...overrides,
})

// 15:00 UTC son las 10:00 en Lima: el dia local no cambia.
const buy = order(1, '2026-10-21T15:00:00')
const sell = order(2, '2026-10-20T15:00:00', { side: 'SELL', tokensMoved: 40 })
const rejected = order(3, '2026-10-01T15:00:00', { status: 'REJECTED', executionPrice: null, tokensMoved: 0 })

describe('orders', () => {
  it('ordena de la mas reciente a la mas antigua', () => {
    expect(newestFirst([rejected, buy, sell]).map((o) => o.id)).toEqual([1, 2, 3])
  })

  it('el periodo cuenta dias hacia atras desde hoy', () => {
    expect(inPeriod([buy, sell, rejected], '7d', '2026-10-21').map((o) => o.id)).toEqual([1, 2])
    expect(inPeriod([buy, sell, rejected], 'todo', '2026-10-21')).toHaveLength(3)
  })

  it('compras y ventas son solo las ejecutadas', () => {
    expect(matchesKind(rejected, 'compras')).toBe(false)
    expect(matchesKind(rejected, 'rechazadas')).toBe(true)
    expect(matchesKind(sell, 'ventas')).toBe(true)
  })

  it('las fichas llevan el signo del saldo y una rechazada no mueve nada', () => {
    expect(signedTokens(buy)).toBe(-100)
    expect(signedTokens(sell)).toBe(40)
    expect(signedTokens(rejected)).toBeNull()
  })

  it('las metricas suman lo ejecutado y reparten en siete tramos', () => {
    const [executed, invested, received, rejectedCount] = orderMetrics([buy, sell, rejected], '30d', '2026-10-21')
    expect(executed).toMatchObject({ value: 2, count: 3 })
    expect(invested).toMatchObject({ value: 100, count: 1 })
    expect(received).toMatchObject({ value: 40, count: 1 })
    expect(rejectedCount.value).toBe(1)
    expect(invested.bars).toHaveLength(7)
    expect(invested.bars[6]).toBe(100)
    // Hace 20 de 30 dias: el tercer tramo de siete.
    expect(rejectedCount.bars[2]).toBe(1)
  })

  it('agrupa por dia con el neto, o sin neto si nada se ejecuto', () => {
    const groups = groupByDay([buy, order(4, '2026-10-21T16:00:00', { side: 'SELL', tokensMoved: 30 }), rejected])
    expect(groups.map((g) => [g.day, g.net])).toEqual([
      ['2026-10-21', -70],
      ['2026-10-01', null],
    ])
  })

  it('titula hoy y ayer', () => {
    expect(dayTitle('2026-10-21', '2026-10-21')).toBe('Hoy · Miércoles, 21 de octubre')
    expect(dayTitle('2026-10-20', '2026-10-21')).toMatch(/^Ayer · /)
  })
})
