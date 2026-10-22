import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { Portfolio, TradeOrder } from '@/types/market'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import { walletService } from '@/services/walletService'
import PortfolioPage from './PortfolioPage'

vi.mock('@/services/portfolioService', () => ({
  portfolioService: { get: vi.fn(), allOrders: vi.fn(), placeOrder: vi.fn() },
}))
vi.mock('@/services/walletService', () => ({ walletService: { get: vi.fn(), transactionsSince: vi.fn() } }))
vi.mock('@/services/marketService', () => ({
  marketService: { getPriceHistory: vi.fn(), getQuote: vi.fn(), searchAssets: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const getPortfolio = vi.mocked(portfolioService.get)
const placeOrder = vi.mocked(portfolioService.placeOrder)

const portfolio: Portfolio = {
  id: 1,
  investedTokens: 484.86,
  simulatedValue: 455.27,
  unrealizedPnl: 3.79,
  realizedPnl: 0,
  updatedAt: '2026-10-21T15:00:00',
  positions: [
    {
      id: 1,
      assetId: 13358,
      symbol: 'AAPL',
      assetName: 'Apple Inc.',
      quantity: 0.199625,
      averageCost: 333.75,
      currentPrice: 343.94,
      marketValue: 68.66,
      unrealizedPnl: 2.04,
    },
    {
      id: 2,
      assetId: 6631,
      symbol: 'SPY',
      assetName: 'SPDR S&P 500 ETF',
      quantity: 0.5,
      averageCost: 769.72,
      currentPrice: 773.22,
      marketValue: 386.61,
      unrealizedPnl: 1.75,
    },
  ],
}

const buy: TradeOrder = {
  id: 1,
  assetId: 13358,
  symbol: 'AAPL',
  side: 'BUY',
  quantity: 0.199625,
  status: 'EXECUTED',
  executionPrice: 333.75,
  tokensMoved: 66.62,
  tokenRate: 1,
  rejectionReason: null,
  createdAt: '2026-10-04T15:00:00',
  executedAt: '2026-10-04T15:00:00',
}

function renderPage() {
  const router = createMemoryRouter([{ path: '/portafolio', element: <PortfolioPage /> }], {
    initialEntries: ['/portafolio'],
  })
  render(<RouterProvider router={router} />)
}

describe('PortfolioPage', () => {
  beforeEach(() => {
    getPortfolio.mockReset()
    getPortfolio.mockResolvedValue(portfolio)
    placeOrder.mockReset()
    vi.mocked(portfolioService.allOrders).mockResolvedValue([buy])
    vi.mocked(walletService.get).mockResolvedValue({ id: 1, tokenBalance: 597.62, updatedAt: '2026-10-21T15:00:00' })
    vi.mocked(walletService.transactionsSince).mockResolvedValue([])
    vi.mocked(marketService.getPriceHistory).mockResolvedValue([
      { date: '2026-10-05', closePrice: 330 },
      { date: '2026-10-20', closePrice: 343 },
    ])
    vi.mocked(marketService.getQuote).mockResolvedValue({
      symbol: 'AAPL',
      price: 343.94,
      previousClose: 340,
      changePercent: 1.16,
      currency: 'USD',
      updatedAt: '2026-10-21T15:00:00',
    })
  })

  it('las cifras de arriba son las del backend', async () => {
    renderPage()

    const strip = await screen.findByRole('region', { name: 'Últimos 30 días' })
    expect(await within(strip).findByText(/^597\.62 fichas$/)).toBeInTheDocument()
    expect(within(strip).getByText(/^455\.27 fichas$/)).toBeInTheDocument()
    expect(within(strip).getByText(/^\+3\.79 fichas$/)).toBeInTheDocument()
    expect(await within(strip).findAllByRole('img', { name: /en los últimos 30 días$/ })).toHaveLength(4)
  })

  it('la primera posicion viene abierta con su mes y se puede cerrar', async () => {
    renderPage()

    const aapl = await screen.findByRole('button', { name: /AAPL/, expanded: true })
    expect(await screen.findByRole('img', { name: /^AAPL: cierres del último mes/ })).toBeInTheDocument()
    expect(screen.getByText(/^\+1\.16 % hoy$/)).toBeInTheDocument()
    await userEvent.click(aapl)
    expect(aapl).toHaveAttribute('aria-expanded', 'false')
  })

  it('vender desde una posicion arma el ticket, pide revisar y luego ejecuta', async () => {
    placeOrder.mockResolvedValue({ ...buy, id: 2, side: 'SELL', quantity: 0.1, tokensMoved: 34.39 })
    renderPage()

    await screen.findByRole('button', { name: /AAPL/, expanded: true })
    await userEvent.click(screen.getByRole('button', { name: 'Vender' }))

    const ticket = screen.getByRole('region', { name: 'Nueva orden' })
    expect(within(ticket).getByRole('button', { name: 'Vender' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.type(await within(ticket).findByLabelText('Cantidad de acciones'), '0.1')
    await waitFor(() => expect(within(ticket).getByRole('button', { name: 'Revisar venta' })).toBeEnabled())
    await userEvent.click(within(ticket).getByRole('button', { name: 'Revisar venta' }))

    expect(within(ticket).getByText(/^Vas a vender ≈ 0\.1 AAPL por 34\.39 fichas/)).toBeInTheDocument()
    expect(placeOrder).not.toHaveBeenCalled()
    await userEvent.click(within(ticket).getByRole('button', { name: 'Confirmar venta' }))

    await waitFor(() =>
      expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ assetId: 13358, side: 'SELL', quantity: 0.1 })),
    )
    await waitFor(() => expect(getPortfolio).toHaveBeenCalledTimes(2))
  })

  it('no deja vender mas de lo que se tiene', async () => {
    renderPage()

    await screen.findByRole('button', { name: /AAPL/, expanded: true })
    await userEvent.click(screen.getByRole('button', { name: 'Vender' }))
    const ticket = screen.getByRole('region', { name: 'Nueva orden' })
    await userEvent.type(await within(ticket).findByLabelText('Cantidad de acciones'), '1')
    await waitFor(() => expect(within(ticket).getByRole('button', { name: 'Revisar venta' })).toBeEnabled())
    await userEvent.click(within(ticket).getByRole('button', { name: 'Revisar venta' }))

    expect(await within(ticket).findByText(/^Solo tienes 0\.199625 acciones\.$/)).toBeInTheDocument()
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it('el reparto suma las fichas libres y lo invertido', async () => {
    renderPage()

    const donut = await screen.findByRole('region', { name: 'Cómo se reparte' })
    expect(await within(donut).findByText('1,052.89')).toBeInTheDocument()
    expect(within(donut).getByText(/^SPY es tu mayor inversión: 37 %/)).toBeInTheDocument()
  })
})
