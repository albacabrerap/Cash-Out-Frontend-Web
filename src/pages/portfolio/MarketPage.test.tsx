import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { Asset, AssetQuote, AssetType, Portfolio } from '@/types/market'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import MarketPage from './MarketPage'

const media = vi.hoisted(() => ({ wide: true }))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => media.wide }))
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))
vi.mock('@/services/portfolioService', () => ({ portfolioService: { get: vi.fn(), placeOrder: vi.fn() } }))
vi.mock('@/services/walletService', () => ({
  walletService: { get: vi.fn().mockResolvedValue({ id: 1, tokenBalance: 500, updatedAt: '2026-10-21T15:00:00' }) },
}))
vi.mock('@/services/marketService', () => ({
  marketService: {
    searchAssets: vi.fn(),
    getAsset: vi.fn(),
    quotes: vi.fn(),
    getQuote: vi.fn(),
    getPriceHistory: vi.fn(),
  },
}))

const searchAssets = vi.mocked(marketService.searchAssets)
const getAsset = vi.mocked(marketService.getAsset)

const asset = (id: number, symbol: string, name: string, type: AssetType): Asset => ({
  id,
  symbol,
  name,
  type,
  currency: 'USD',
  active: true,
  source: type === 'CRYPTO' ? 'COINBASE' : 'ALPACA',
  exchange: type === 'CRYPTO' ? null : 'NASDAQ',
})

const AAPL = asset(13358, 'AAPL', 'Apple Inc.', 'STOCK')
const AMZN = asset(13400, 'AMZN', 'Amazon.com Inc.', 'STOCK')
const SPY = asset(6631, 'SPY', 'SPDR S&P 500 ETF', 'ETF')
const FEATURED = [SPY, asset(7000, 'QQQ', 'Invesco QQQ', 'ETF'), asset(9001, 'BTC-USD', 'Bitcoin', 'CRYPTO'), asset(9002, 'ETH-USD', 'Ethereum', 'CRYPTO')]
const TOTALS: Record<string, number> = { all: 14210, STOCK: 11800, ETF: 2300, CRYPTO: 110 }

const quote = (symbol: string, price: number, changePercent: number): AssetQuote => ({
  symbol,
  price,
  previousClose: price,
  changePercent,
  currency: 'USD',
  updatedAt: '2026-10-21T15:00:00',
})
const QUOTES: Record<number, AssetQuote> = {
  [AAPL.id]: quote('AAPL', 343.94, 1.16),
  [AMZN.id]: quote('AMZN', 221.5, -0.84),
  [SPY.id]: quote('SPY', 773.22, 0.31),
}

const portfolio: Portfolio = {
  id: 1,
  investedTokens: 66.62,
  simulatedValue: 68.66,
  unrealizedPnl: 2.04,
  realizedPnl: 0,
  updatedAt: '2026-10-21T15:00:00',
  positions: [
    {
      id: 1,
      assetId: AAPL.id,
      symbol: 'AAPL',
      assetName: 'Apple Inc.',
      quantity: 0.199625,
      averageCost: 333.75,
      currentPrice: 343.94,
      marketValue: 68.66,
      unrealizedPnl: 2.04,
    },
  ],
}

const page = (content: Asset[], totalElements = content.length) => ({
  content,
  page: 0,
  size: 10,
  totalElements,
  totalPages: Math.ceil(totalElements / 10),
})

function renderPage(path = '/portafolio/mercado') {
  const router = createMemoryRouter(
    [
      { path: '/portafolio/mercado', element: <MarketPage /> },
      { path: '/portafolio/mercado/:id', element: <p>Página del activo</p> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('MarketPage', () => {
  beforeEach(() => {
    media.wide = true
    searchAssets.mockReset()
    searchAssets.mockImplementation(async (params) => {
      if (params.size === 1 && params.search) return page(FEATURED.filter((item) => item.symbol === params.search))
      if (params.size === 1) return page([], TOTALS[params.type ?? 'all'])
      if (params.search === 'zzz') return page([])
      return page([AAPL, AMZN, SPY], 3)
    })
    getAsset.mockReset()
    getAsset.mockImplementation(async (id) => [AAPL, AMZN, SPY].find((item) => item.id === id)!)
    vi.mocked(marketService.quotes).mockImplementation(async (ids) => ids.flatMap((id) => QUOTES[id] ?? []))
    vi.mocked(marketService.getQuote).mockImplementation(async (id) => QUOTES[id] ?? quote('X', 1, 0))
    vi.mocked(marketService.getPriceHistory).mockResolvedValue([
      { date: '2026-09-21', closePrice: 700 },
      { date: '2026-10-20', closePrice: 770 },
    ])
    vi.mocked(portfolioService.get).mockResolvedValue(portfolio)
  })

  it('cada fila trae su precio del lote y el primer destacado abre el panel', async () => {
    renderPage()

    const rows = await screen.findByRole('list', { name: 'Activos' })
    const aapl = (await within(rows).findByRole('button', { name: 'AAPL' })).closest('li')!
    expect(await within(aapl).findByText(/343\.94/)).toBeInTheDocument()
    expect(within(aapl).getAllByText('+1.16 %')).not.toHaveLength(0)
    expect(within(aapl).getByText(/en tu portafolio/)).toBeInTheDocument()
    expect(marketService.quotes).toHaveBeenCalledWith([AAPL.id, AMZN.id, SPY.id], expect.anything())

    const featured = await screen.findByRole('region', { name: 'Destacados' })
    expect(await within(featured).findAllByRole('button')).toHaveLength(4)
    expect(within(featured).getByRole('button', { name: /^SPY/ })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('complementary', { name: 'SPY' })).toBeInTheDocument()
    expect(within(featured).getAllByText('+10.00 % en el mes')).toHaveLength(4)
  })

  it('elegir una fila la muestra al lado, con vender solo si la tienes', async () => {
    renderPage()

    const row = await screen.findByRole('button', { name: 'AAPL' })
    await userEvent.click(row)

    expect(row).toHaveAttribute('aria-pressed', 'true')
    const panel = await screen.findByRole('complementary', { name: 'AAPL' })
    expect(within(panel).getByRole('button', { name: 'Vender' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'AMZN' }))
    const other = await screen.findByRole('complementary', { name: 'AMZN' })
    expect(within(other).getByRole('button', { name: 'Vender' })).toBeDisabled()
  })

  it('las facetas muestran cuantos hay y la letra filtra por el inicio del simbolo', async () => {
    renderPage()

    const facets = await screen.findByRole('group', { name: 'Tipo de activo' })
    expect(await within(facets).findByText('14,210')).toBeInTheDocument()
    await userEvent.click(within(facets).getByRole('button', { name: /^Cripto/ }))
    await waitFor(() => expect(searchAssets).toHaveBeenCalledWith(expect.objectContaining({ size: 10, type: 'CRYPTO' }), expect.anything()))

    await userEvent.click(screen.getByRole('button', { name: 'Símbolos que empiezan con A' }))
    await waitFor(() =>
      expect(searchAssets).toHaveBeenCalledWith(expect.objectContaining({ size: 10, type: 'CRYPTO', letter: 'A' }), expect.anything()),
    )
    expect(screen.getByRole('button', { name: 'Símbolos que empiezan con A' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('solo los mios lista lo que tienes sin paginar el catalogo', async () => {
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Solo los míos · 1' }))

    const rows = await screen.findByRole('list', { name: 'Activos' })
    expect(await within(rows).findByRole('button', { name: 'AAPL' })).toBeInTheDocument()
    expect(within(rows).queryByRole('button', { name: 'AMZN' })).not.toBeInTheDocument()
    expect(getAsset).toHaveBeenCalledWith(AAPL.id, expect.anything())
    expect(screen.queryByRole('navigation', { name: /paginación/i })).not.toBeInTheDocument()
  })

  it('sin resultados sugiere busquedas que si existen', async () => {
    renderPage('/portafolio/mercado?search=zzz')

    expect(await screen.findByText('No encontramos «zzz»')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tesla' }))
    await waitFor(() => expect(searchAssets).toHaveBeenCalledWith(expect.objectContaining({ search: 'Tesla' }), expect.anything()))
  })

  it('en el celular la fila es un enlace a la pagina del activo y no hay panel', async () => {
    media.wide = false
    renderPage()

    const link = await screen.findByRole('link', { name: 'AAPL' })
    expect(link).toHaveAttribute('href', `/portafolio/mercado/${AAPL.id}`)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})
