import type { TokenTransaction } from '@/types/finance'
import type { TradeOrder } from '@/types/market'
import { lastDays, portfolioHistory } from './portfolioHistory'

function order(overrides: Partial<TradeOrder>): TradeOrder {
  return {
    id: 1,
    assetId: 10,
    symbol: 'SPY',
    side: 'BUY',
    quantity: 1,
    status: 'EXECUTED',
    executionPrice: 100,
    tokensMoved: 100,
    tokenRate: 1,
    rejectionReason: null,
    createdAt: '2026-10-02T15:00:00',
    executedAt: '2026-10-02T15:00:00',
    ...overrides,
  }
}

function tx(id: number, amount: number, balanceAfter: number, createdAt: string): TokenTransaction {
  return { id, amount, reason: 'INVESTMENT', referenceId: null, balanceAfter, createdAt }
}

const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']
const now = { tokens: 999, value: 999, unrealized: 999, realized: 999 }

describe('lastDays', () => {
  it('cuenta hacia atras desde hoy, incluyendolo', () => {
    expect(lastDays(3, '2026-10-01')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01'])
  })
})

describe('portfolioHistory', () => {
  const orders = [
    order({ id: 1, quantity: 2, tokensMoved: 200, executedAt: '2026-10-02T15:00:00' }),
    order({ id: 2, side: 'SELL', quantity: 1, tokensMoved: 130, executedAt: '2026-10-04T15:00:00' }),
    order({ id: 3, status: 'REJECTED', quantity: 50, tokensMoved: 0, executedAt: null }),
  ]
  const closes = new Map([
    [
      10,
      [
        { date: '2026-10-02', closePrice: 110 },
        { date: '2026-10-03', closePrice: 120 },
      ],
    ],
  ])
  const ledger = [tx(1, -200, 300, '2026-10-02T15:00:00'), tx(2, 130, 430, '2026-10-04T15:00:00')]

  const history = portfolioHistory(days, orders, closes, ledger, now)

  it('antes de la primera orden no hay posiciones y el saldo es el de antes del primer movimiento', () => {
    expect(history[0]).toEqual({ date: '2026-10-01', tokens: 500, value: 0, unrealized: 0, realized: 0 })
  })

  it('valora lo que se tiene al cierre del dia, y sin cierre usa el ultimo conocido', () => {
    expect(history[1]).toMatchObject({ tokens: 300, value: 220, unrealized: 20 })
    expect(history[2]).toMatchObject({ value: 240, unrealized: 40 })
    expect(history[3]).toMatchObject({ tokens: 430, value: 120, unrealized: 20, realized: 30 })
  })

  it('el ultimo dia es lo que dice el backend', () => {
    expect(history[4]).toEqual({ date: '2026-10-05', ...now })
  })

  it('las ordenes rechazadas no cuentan', () => {
    expect(history.slice(0, 4).every((day) => day.value <= 240)).toBe(true)
  })
})
