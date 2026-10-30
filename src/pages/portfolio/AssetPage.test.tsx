import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ApiError } from '@/api/errors'
import { addDays } from '@/lib/dates'
import type { Asset, Portfolio, PricePoint, TradeOrder } from '@/types/market'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import AssetPage from './AssetPage'

vi.mock('@/services/marketService', () => ({
  marketService: { getAsset: vi.fn(), getQuote: vi.fn(), getPriceHistory: vi.fn(), searchAssets: vi.fn() },
}))
vi.mock('@/services/portfolioService', () => ({ portfolioService: { get: vi.fn(), allOrders: vi.fn(), placeOrder: vi.fn() } }))
vi.mock('@/services/walletService', () => ({
  walletService: { get: vi.fn().mockResolvedValue({ id: 1, tokenBalance: 597.62, updatedAt: '2026-10-21T15:00:00' }) },
}))
vi.mock('@/services/watchlistService', () => ({
  watchlistService: { list: vi.fn().mockResolvedValue([]), add: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/services/newsService', () => ({ newsService: { feed: vi.fn().mockResolvedValue({ items: [], nextPageToken: null }) } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const AAPL: Asset = { id: 7, symbol: 'AAPL', name: 'Apple Inc. Common Stock', type: 'STOCK', currency: 'USD', active: true, source: 'ALPACA', exchange: 'NASDAQ' }
const SPY = { ...AAPL, id: 9, symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'ETF' as const }

// Dos anos de cierres que suben en linea recta: los rendimientos son faciles de verificar.
const history = (start: number, step: number): PricePoint[] =>
  Array.from({ length: 730 }, (_, i) => ({ date: addDays('2024-10-24', i), closePrice: start + step * i }))

const order: TradeOrder = {
  id: 1,
  assetId: 7,
  symbol: 'AAPL',
  side: 'BUY',
  quantity: 0.299625,
  status: 'EXECUTED',
  executionPrice: 333.75,
  tokensMoved: 100,
  tokenRate: 1,
  rejectionReason: null,
  createdAt: '2026-10-03T20:04:00',
  executedAt: '2026-10-03T20:04:00',
}

function renderPage(path = '/portafolio/mercado/7') {
  const router = createMemoryRouter(
    [
      { path: '/portafolio/mercado/:id', element: <AssetPage /> },
      { path: '/portafolio/mercado', element: <p>Mercado</p> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('AssetPage', () => {
  beforeEach(() => {
    vi.mocked(marketService.getAsset).mockResolvedValue(AAPL)
    vi.mocked(marketService.getQuote).mockResolvedValue({
      symbol: 'AAPL',
      price: 347.69,
      previousClose: 348.34,
      changePercent: -0.19,
      currency: 'USD',
      updatedAt: '2026-10-23T15:00:00',
    })
    vi.mocked(marketService.getPriceHistory).mockImplementation(async (id) => (id === SPY.id ? history(500, 0.5) : history(200, 0.2)))
    vi.mocked(marketService.searchAssets).mockResolvedValue({ content: [SPY], page: 0, size: 1, totalElements: 1, totalPages: 1 })
    vi.mocked(portfolioService.get).mockResolvedValue({
      positions: [
        { id: 1, assetId: 7, symbol: 'AAPL', assetName: 'Apple', quantity: 0.199625, averageCost: 333.75, currentPrice: 347.69, marketValue: 69.41, unrealizedPnl: 2.79 },
      ],
      simulatedValue: 462.75,
    } as Portfolio)
    vi.mocked(portfolioService.allOrders).mockResolvedValue([order, { ...order, id: 2, assetId: 99, symbol: 'MSFT' }])
  })

  it('muestra el nombre sin la clase de accion, el precio y tus datos', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Apple Inc.' })).toBeInTheDocument()
    expect((await screen.findAllByText('US$ 347.69'))[0]).toBeInTheDocument()
    const position = screen.getByRole('region', { name: 'Tu posición' })
    expect(within(position).getByText('Es el 15 % de lo que tienes invertido')).toBeInTheDocument()
    const orders = await screen.findByRole('list', { name: 'Órdenes de AAPL' })
    expect(within(orders).getAllByRole('listitem')).toHaveLength(1)
  })

  it('cada rango compara contra el S&P 500 y elegirlo cambia el grafico', async () => {
    const router = renderPage()
    const returns = await screen.findByRole('region', { name: 'Cuánto rindió' })
    expect(await within(returns).findAllByText(/^S&P 500 \+/)).toHaveLength(5)

    await userEvent.click(within(returns).getByRole('button', { name: /^1 año/ }))
    expect(router.state.location.search).toBe('?rango=1A')
    expect(screen.getByRole('button', { name: '1A', pressed: true })).toBeInTheDocument()
  })

  it('comparar con el S&P 500 queda en la URL y cambia el titulo del grafico', async () => {
    const router = renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /vs S&P 500/ }))

    expect(router.state.location.search).toBe('?comparar=1')
    expect(screen.getByRole('heading', { name: 'AAPL frente al S&P 500' })).toBeInTheDocument()
  })

  it('el ticket opera solo este activo, sin buscador', async () => {
    renderPage()
    const ticket = await screen.findByRole('region', { name: 'Operar AAPL' })
    expect(within(ticket).queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(ticket).getByRole('button', { name: 'Vender' })).toBeEnabled()
  })

  it('un activo que no existe muestra el aviso y la vuelta al mercado', async () => {
    vi.mocked(marketService.getAsset).mockRejectedValue(new ApiError({ kind: 'http', status: 404 }))
    renderPage()
    expect(await screen.findByText('No encontramos este activo')).toBeInTheDocument()
  })
})
