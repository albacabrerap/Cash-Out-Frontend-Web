import type { SavingsGoal } from '@/types/goals'
import type { Position } from '@/types/market'
import { changeSince, goalPace, portfolioAllocation, savingsBeams, savingsRate, tokenMoveLabel } from './dashboard'

const goal = (overrides: Partial<SavingsGoal>): SavingsGoal => ({
  id: 1,
  name: 'Laptop',
  targetAmount: 2400,
  accumulatedAmount: 360,
  progressPercent: 15,
  deadline: '2027-03-31',
  status: 'IN_PROGRESS',
  completedAt: null,
  createdAt: '2026-04-01T15:00:00',
  ...overrides,
})

const position = (symbol: string, marketValue: number): Position => ({
  id: 1,
  assetId: 1,
  symbol,
  assetName: symbol,
  quantity: 1,
  averageCost: marketValue,
  currentPrice: marketValue,
  marketValue,
  unrealizedPnl: 0,
})

describe('goalPace', () => {
  const today = new Date(2026, 9, 19, 12)

  it('una meta que avanza menos que el tiempo va atrasada y dice cuanto apartar al mes', () => {
    const pace = goalPace(goal({}), today)

    expect(pace.progress).toBe(0.15)
    expect(pace.elapsed).toBeCloseTo(0.55, 2)
    expect(pace.late).toBe(true)
    expect(pace.perMonth).toBe(380)
  })

  it('unos puntos detras del calendario todavia cuentan como a tiempo', () => {
    const pace = goalPace(goal({ targetAmount: 600, accumulatedAmount: 30, createdAt: '2026-10-01T15:00:00', deadline: '2027-06-30' }), today)

    expect(pace.late).toBe(false)
  })

  it('a dias de vencer avisa que ya no hay meses: lo que falta va de una vez', () => {
    const pace = goalPace(goal({ targetAmount: 100, accumulatedAmount: 40, deadline: '2026-10-25' }), today)

    expect(pace.dueSoon).toBe(true)
    expect(pace.remaining).toBe(60)
    expect(goalPace(goal({}), today).dueSoon).toBe(false)
  })
})

describe('savingsRate', () => {
  it('es lo ahorrado sobre lo que entro; sin ingresos no hay tasa', () => {
    expect(savingsRate({ totalIncome: 13100, totalNet: 2030 })).toBeCloseTo(15.5, 1)
    expect(savingsRate({ totalIncome: 0, totalNet: 0 })).toBeNull()
  })
})

describe('savingsBeams', () => {
  it('el mes con mas ahorro llega mas lejos y un mes en rojo queda corto', () => {
    const beams = savingsBeams([
      { month: '2026-01', income: 1200, expense: 1010, net: 190 },
      { month: '2026-02', income: 1200, expense: 1260, net: -60 },
      { month: '2026-03', income: 1800, expense: 1320, net: 480 },
    ])

    expect(beams.map((b) => b.x)).toEqual([90 + (190 / 480) * 440, 34, 530])
    expect(beams.map((b) => b.y)).toEqual([10, 100, 190])
  })
})

describe('portfolioAllocation', () => {
  it('ordena por valor y junta el resto en "Otros"', () => {
    const slices = portfolioAllocation([
      position('AAPL', 50),
      position('SPY', 200),
      position('BTC-USD', 100),
      position('NVDA', 30),
      position('KO', 20),
    ])

    expect(slices.map((s) => s.label)).toEqual(['SPY', 'BTC-USD', 'AAPL', 'Otros'])
    expect(slices.map((s) => s.share)).toEqual([0.5, 0.25, 0.125, 0.125])
  })

  it('sin valor no hay reparto', () => {
    expect(portfolioAllocation([])).toEqual([])
  })
})

describe('changeSince', () => {
  const points = [
    { date: '2026-10-01', closePrice: 100 },
    { date: '2026-10-03', closePrice: 104 },
    { date: '2026-10-17', closePrice: 106.08 },
  ]

  it('mide desde el primer cierre de esa fecha en adelante', () => {
    expect(changeSince(points, '2026-10-02')).toBeCloseTo(2, 5)
  })

  it('sin dos cierres no hay comparacion', () => {
    expect(changeSince(points, '2026-10-17')).toBeNull()
    expect(changeSince(points, '2026-10-20')).toBeNull()
  })
})

describe('tokenMoveLabel', () => {
  it('distingue compras de ventas por el signo', () => {
    expect(tokenMoveLabel({ reason: 'INVESTMENT', amount: -68.55 })).toBe('Compra en el mercado')
    expect(tokenMoveLabel({ reason: 'INVESTMENT', amount: 42.1 })).toBe('Venta en el mercado')
    expect(tokenMoveLabel({ reason: 'RACE_PRIZE', amount: 18 })).toBe('Premio de la carrera')
  })
})
