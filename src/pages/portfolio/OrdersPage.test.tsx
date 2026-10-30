import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { Asset, Portfolio, TradeOrder } from '@/types/market'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import OrdersPage from './OrdersPage'

const media = vi.hoisted(() => ({ wide: true }))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => media.wide }))
vi.mock('@/services/portfolioService', () => ({ portfolioService: { allOrders: vi.fn(), get: vi.fn(), placeOrder: vi.fn() } }))
vi.mock('@/services/walletService', () => ({
  walletService: { get: vi.fn().mockResolvedValue({ id: 1, tokenBalance: 500, updatedAt: '2026-10-21T15:00:00' }) },
}))
vi.mock('@/services/marketService', () => ({ marketService: { getAsset: vi.fn(), getQuote: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Hace unas horas, en el formato sin zona del backend: cae siempre en los ultimos 30 dias.
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString().slice(0, 19)

const order = (id: number, overrides: Partial<TradeOrder>): TradeOrder => ({
  id,
  assetId: 7,
  symbol: 'AAPL',
  side: 'BUY',
  quantity: 0.5,
  status: 'EXECUTED',
  executionPrice: 200,
  tokensMoved: 100,
  tokenRate: 1,
  rejectionReason: null,
  createdAt: hoursAgo(id),
  executedAt: hoursAgo(id),
  ...overrides,
})

const orders = [
  order(1, {}),
  order(2, { side: 'SELL', quantity: 0.2, tokensMoved: 40 }),
  order(3, { assetId: 9, symbol: 'NVDA', status: 'REJECTED', executionPrice: null, tokensMoved: 0, rejectionReason: 'Fichas insuficientes.' }),
]

function renderPage(path = '/portafolio/ordenes') {
  const router = createMemoryRouter(
    [
      { path: '/portafolio/ordenes', element: <OrdersPage /> },
      { path: '/portafolio/mercado/:id', element: <p>Activo</p> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('OrdersPage', () => {
  beforeEach(() => {
    media.wide = true
    vi.mocked(portfolioService.allOrders).mockResolvedValue(orders)
    vi.mocked(portfolioService.get).mockResolvedValue({ positions: [{ assetId: 7, quantity: 0.3 }] } as Portfolio)
    vi.mocked(marketService.getAsset).mockImplementation(async (id) => ({ id, name: id === 7 ? 'Apple Inc.' : 'NVIDIA' }) as Asset)
    vi.mocked(marketService.getQuote).mockResolvedValue({
      symbol: 'AAPL',
      price: 200,
      previousClose: 198,
      changePercent: 1,
      currency: 'USD',
      updatedAt: '',
    })
  })

  it('resume el periodo y abre la mas reciente en el comprobante', async () => {
    renderPage()

    const metrics = await screen.findByRole('region', { name: 'Tus órdenes' })
    expect(within(metrics).getByText('en 1 compra')).toBeInTheDocument()
    expect(within(metrics).getByText('el motivo está en cada una')).toBeInTheDocument()
    const receipt = await screen.findByRole('complementary', { name: 'Compra de AAPL' })
    expect(within(receipt).getByText('Apple Inc.')).toBeInTheDocument()
    expect(within(receipt).getAllByText('−100.00 fichas')).not.toHaveLength(0)
  })

  it('una rechazada muestra el motivo y se puede intentar de nuevo', async () => {
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'NVDA' }))
    const receipt = screen.getByRole('complementary', { name: 'Compra de NVDA' })
    expect(within(receipt).getByText('Fichas insuficientes.')).toBeInTheDocument()

    await userEvent.click(within(receipt).getByRole('button', { name: 'Intentar de nuevo' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('NVDA')
  })

  it('el tipo y la busqueda filtran y quedan en la URL', async () => {
    const router = renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /^Rechazadas/ }))
    expect(router.state.location.search).toBe('?tipo=rechazadas')
    expect(screen.queryByRole('button', { name: 'AAPL' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^Todas/ }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por símbolo' }), 'nvd')
    // La busqueda espera a que se deje de escribir; con la suite en paralelo puede pasar del segundo.
    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'AAPL' })).toHaveLength(0), { timeout: 3000 })
    expect(screen.getByRole('button', { name: 'NVDA' })).toBeInTheDocument()
  })

  it('sin filtros que coincidan ofrece ver todas', async () => {
    renderPage('/portafolio/ordenes?q=TSLA')

    await userEvent.click(await screen.findByRole('button', { name: 'Ver todas' }))
    expect(await screen.findByRole('button', { name: 'NVDA' })).toBeInTheDocument()
  })

  it('en el celular el comprobante se abre en una hoja', async () => {
    media.wide = false
    renderPage()

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    await userEvent.click((await screen.findAllByRole('button', { name: 'AAPL' }))[0])
    expect(await screen.findByRole('dialog')).toHaveTextContent(/Comprobante/)
  })
})
