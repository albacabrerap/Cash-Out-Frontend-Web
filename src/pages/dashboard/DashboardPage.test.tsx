import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { SavingsGoal } from '@/types/goals'
import type { Portfolio, Position } from '@/types/market'
import type { MonthlyFlows } from '@/types/movements'
import { goalService } from '@/services/goalService'
import { marketService } from '@/services/marketService'
import { movementService } from '@/services/movementService'
import { portfolioService } from '@/services/portfolioService'
import { savingsService } from '@/services/savingsService'
import { walletService } from '@/services/walletService'
import DashboardPage from './DashboardPage'

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { name: 'Valeria Ríos' } }) }))
// jsdom no tiene matchMedia; sin animaciones, la actividad se despliega de una vez.
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))
vi.mock('@/services/movementService', () => ({ movementService: { list: vi.fn(), monthly: vi.fn() } }))
vi.mock('@/services/savingsService', () => ({ savingsService: { get: vi.fn() } }))
vi.mock('@/services/walletService', () => ({ walletService: { get: vi.fn(), transactions: vi.fn() } }))
vi.mock('@/services/goalService', () => ({ goalService: { list: vi.fn() } }))
vi.mock('@/services/portfolioService', () => ({ portfolioService: { get: vi.fn(), listOrders: vi.fn() } }))
vi.mock('@/services/marketService', () => ({ marketService: { searchAssets: vi.fn(), getPriceHistory: vi.fn() } }))

const list = vi.mocked(movementService.list)
const monthly = vi.mocked(movementService.monthly)
const thisYear = new Date().getMonth() + 1

// Tres meses bastan para cualquier rango: el grafico y los haces dibujan los que lleguen.
const flows: MonthlyFlows = {
  from: '2026-08',
  to: '2026-10',
  months: [
    { month: '2026-08', income: 1200, expense: 1110, net: 90 },
    { month: '2026-09', income: 1250, expense: 1060, net: 190 },
    { month: '2026-10', income: 1200, expense: 760, net: 440 },
  ],
  totalIncome: 3650,
  totalExpense: 2930,
  totalNet: 720,
}

const goal = (overrides: Partial<SavingsGoal>): SavingsGoal => ({
  id: 1,
  name: 'Laptop para la U',
  targetAmount: 2400,
  accumulatedAmount: 120,
  progressPercent: 5,
  deadline: '2030-12-31',
  status: 'IN_PROGRESS',
  completedAt: null,
  createdAt: '2020-01-01T15:00:00',
  ...overrides,
})

const position = (symbol: string, marketValue: number, averageCost: number): Position => ({
  id: 1,
  assetId: 7,
  symbol,
  assetName: symbol === 'SPY' ? 'S&P 500' : 'Apple',
  quantity: 1,
  averageCost,
  currentPrice: marketValue,
  marketValue,
  unrealizedPnl: marketValue - averageCost,
})

const portfolio = (positions: Position[]): Portfolio => ({
  id: 1,
  investedTokens: positions.reduce((sum, p) => sum + p.averageCost, 0),
  simulatedValue: positions.reduce((sum, p) => sum + (p.marketValue ?? 0), 0),
  unrealizedPnl: positions.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0),
  realizedPnl: 0,
  positions,
  updatedAt: '2026-10-19T14:00:00',
})

function renderAt(url = '/resumen') {
  const router = createMemoryRouter([{ path: '/resumen', element: <DashboardPage /> }], { initialEntries: [url] })
  render(<RouterProvider router={router} />)
  return router
}

describe('DashboardPage', () => {
  beforeEach(() => {
    list.mockReset()
    monthly.mockReset()
    list.mockResolvedValue({
      content: [
        { id: 3, kind: 'EXPENSE', label: 'Plaza Vea', category: 'FOOD', amount: 84.5, date: '2026-10-18', createdAt: '2026-10-18T20:00:00' },
        { id: 9, kind: 'INCOME', label: 'Prácticas', category: null, amount: 1200, date: '2026-10-15', createdAt: '2026-10-15T14:00:00' },
      ],
      page: 0,
      size: 5,
      totalElements: 14,
      totalPages: 3,
    })
    monthly.mockResolvedValue(flows)
    vi.mocked(savingsService.get).mockResolvedValue({
      id: 1,
      currentBalance: 2030,
      committedAmount: 720,
      availableBalance: 1310,
      updatedAt: '2026-10-19T14:00:00',
    })
    vi.mocked(walletService.get).mockResolvedValue({ id: 1, tokenBalance: 645.9, updatedAt: '2026-10-19T14:00:00' })
    vi.mocked(walletService.transactions).mockResolvedValue({
      content: [{ id: 5, amount: 18, reason: 'RACE_PRIZE', referenceId: 2, balanceAfter: 645.9, createdAt: '2026-10-19T12:00:00' }],
      page: 0,
      size: 3,
      totalElements: 1,
      totalPages: 1,
    })
    vi.mocked(goalService.list).mockResolvedValue([goal({}), goal({ id: 2, name: 'Viaje', status: 'COMPLETED' })])
    vi.mocked(portfolioService.get).mockResolvedValue(portfolio([]))
  })

  it('Tu ahorro junta el total, lo disponible y lo reservado, y pide los meses del año para los haces', async () => {
    renderAt()

    const card = (await screen.findByRole('heading', { name: /Tienes S\/\s?2,030\.00 ahorrados/ })).closest('section')!
    expect(within(card).getByText(/^S\/\s?1,310\.00$/)).toBeInTheDocument()
    expect(within(card).getByText(/^S\/\s?720\.00$/)).toBeInTheDocument()
    expect(within(card).getByText('En 1 meta en curso')).toBeInTheDocument()
    expect(await within(card).findByText('oct · en curso')).toBeInTheDocument()
    expect(monthly).toHaveBeenCalledWith(thisYear, expect.any(AbortSignal))
  })

  it('la tasa de ahorro es lo que quedo sobre lo que entro', async () => {
    renderAt()

    expect(await screen.findByText(/guardaste S\/ 19\. La regla 50\/30\/20/)).toBeInTheDocument()
  })

  it('las fichas muestran el saldo y su ultimo movimiento', async () => {
    renderAt()

    expect(await screen.findByText('645.90')).toBeInTheDocument()
    expect(await screen.findByText('Premio de la carrera')).toBeInTheDocument()
  })

  it('la actividad reciente lista los ultimos movimientos con su signo', async () => {
    renderAt()

    const card = (await screen.findByRole('heading', { name: 'Actividad reciente' })).closest('section')!
    expect(await within(card).findByText('Plaza Vea')).toBeInTheDocument()
    expect(within(card).getByText(/^−S\/\s?84\.50$/)).toBeInTheDocument()
    expect(within(card).getByText(/^\+S\/\s?1,200\.00$/)).toBeInTheDocument()
  })

  it('una meta que avanza menos que el tiempo sale atrasada y dice cuanto apartar al mes', async () => {
    renderAt()

    const card = (await screen.findByRole('heading', { name: 'Tus metas' })).closest('section')!
    expect(await within(card).findByText('Atrasada')).toBeInTheDocument()
    expect(within(card).queryByText('Viaje')).not.toBeInTheDocument()
    expect(within(card).getByText(/va \d+ puntos detrás del ritmo/)).toBeInTheDocument()
  })

  it('el rango del grafico cambia los meses que se piden y queda en la URL', async () => {
    const router = renderAt('/resumen?rango=3M')
    await screen.findByRole('heading', { name: 'Ingresos y gastos' })
    expect(monthly).toHaveBeenCalledWith(3, expect.any(AbortSignal))

    await userEvent.click(screen.getByRole('radio', { name: 'Últimos 6 meses' }))
    expect(monthly).toHaveBeenLastCalledWith(6, expect.any(AbortSignal))
    expect(router.state.location.search).toBe('?rango=6M')
  })

  it('pasar sobre un mes muestra lo que quedo ese mes', async () => {
    renderAt()

    await userEvent.hover(await screen.findByRole('button', { name: /^Setiembre: ingresos/ }))
    expect(screen.getByText('Gastos −5 % vs. ago')).toBeInTheDocument()
  })

  it('sin inversiones invita al mercado y no compara contra el indice', async () => {
    renderAt()

    expect(await screen.findByText('Todavía no inviertes tus fichas')).toBeInTheDocument()
    expect(screen.queryByText(/Le ganas al/)).not.toBeInTheDocument()
  })

  it('con inversiones muestra el reparto y compara contra el S&P 500 desde la primera compra', async () => {
    vi.mocked(portfolioService.get).mockResolvedValue(portfolio([position('SPY', 198.46, 195), position('AAPL', 68.55, 66.7)]))
    vi.mocked(portfolioService.listOrders).mockResolvedValue({
      content: [
        {
          id: 1, assetId: 7, symbol: 'SPY', side: 'BUY', quantity: 0.26, status: 'EXECUTED', executionPrice: 750,
          tokensMoved: 195, tokenRate: 1, rejectionReason: null, createdAt: '2026-10-03T15:00:00', executedAt: '2026-10-03T15:00:00',
        },
      ],
      page: 0,
      size: 1,
      totalElements: 4,
      totalPages: 4,
    })
    vi.mocked(marketService.searchAssets).mockResolvedValue({
      content: [{ id: 50, symbol: 'SPY', name: 'SPDR S&P 500', type: 'ETF', currency: 'USD', active: true, source: 'ALPACA', exchange: 'ARCA' }],
      page: 0,
      size: 5,
      totalElements: 1,
      totalPages: 1,
    })
    vi.mocked(marketService.getPriceHistory).mockResolvedValue([
      { date: '2026-10-02', closePrice: 740 },
      { date: '2026-10-03', closePrice: 750 },
      { date: '2026-10-17', closePrice: 763.5 },
    ])
    renderAt()

    expect(await screen.findByText('Cómo se reparte')).toBeInTheDocument()
    expect(await screen.findByText('+1.80 %')).toBeInTheDocument()
    expect(portfolioService.listOrders).toHaveBeenCalledWith({ page: 0, size: 1, sort: 'createdAt,asc' }, expect.any(AbortSignal))
  })

  it('una cuenta sin movimientos ve los primeros pasos y la meta del 20 % en vez de sus graficos', async () => {
    list.mockResolvedValue({ content: [], page: 0, size: 5, totalElements: 0, totalPages: 0 })
    monthly.mockResolvedValue({ ...flows, months: [], totalIncome: 0, totalExpense: 0, totalNet: 0 })
    renderAt()

    expect(await screen.findByRole('heading', { name: 'Tu cuenta está lista.' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ingresos y gastos' })).not.toBeInTheDocument()
    expect(await screen.findByText('tu meta para empezar')).toBeInTheDocument()
    expect(screen.getByText('Aún no hay movimientos')).toBeInTheDocument()
    expect(screen.queryByText('Todavía no inviertes tus fichas')).not.toBeInTheDocument()
  })
})
