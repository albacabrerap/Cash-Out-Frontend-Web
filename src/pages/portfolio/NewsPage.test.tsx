import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { Portfolio, Position } from '@/types/market'
import type { NewsItem, NewsPage as Page } from '@/types/news'
import { marketService } from '@/services/marketService'
import { newsService } from '@/services/newsService'
import { portfolioService } from '@/services/portfolioService'
import NewsPage from './NewsPage'

vi.mock('@/services/newsService', () => ({ newsService: { feed: vi.fn(), trending: vi.fn() } }))
vi.mock('@/services/portfolioService', () => ({ portfolioService: { get: vi.fn() } }))
vi.mock('@/services/marketService', () => ({ marketService: { getQuote: vi.fn(), getPriceHistory: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const feed = vi.mocked(newsService.feed)

const news = (id: number, overrides: Partial<NewsItem> = {}): NewsItem => {
  const publishedAt = new Date(Date.now() - id * 60_000).toISOString()
  return {
    id,
    headline: `Headline ${id}`,
    summary: `Summary ${id}`,
    source: 'benzinga',
    author: null,
    url: `https://www.benzinga.com/${id}`,
    imageUrl: null,
    publishedAt,
    updatedAt: publishedAt,
    assets: [{ assetId: 9, symbol: 'BTC-USD', name: 'Bitcoin', changePercent: 1.5 }],
    ...overrides,
  }
}

const aapl: Position = {
  id: 1,
  assetId: 7,
  symbol: 'AAPL',
  assetName: 'Apple',
  quantity: 1,
  averageCost: 200,
  currentPrice: 231.4,
  marketValue: 231.4,
  unrealizedPnl: 31.4,
}

function renderPage(positions: Position[], url = '/portafolio/noticias') {
  vi.mocked(portfolioService.get).mockResolvedValue({ positions } as Portfolio)
  const router = createMemoryRouter([{ path: '/portafolio/noticias', element: <NewsPage /> }], { initialEntries: [url] })
  render(<RouterProvider router={router} />)
}

describe('NewsPage', () => {
  beforeEach(() => {
    feed.mockReset()
    feed.mockImplementation(async ({ scope, pageToken }): Promise<Page> =>
      scope === 'mine' && !pageToken
        ? { items: [], nextPageToken: null }
        : pageToken
          ? { items: [news(3)], nextPageToken: null }
          : { items: [news(1), news(2)], nextPageToken: 'p2' },
    )
    vi.mocked(newsService.trending).mockResolvedValue([{ assetId: 7, symbol: 'AAPL', name: 'Apple', mentions: 4 }])
    vi.mocked(marketService.getQuote).mockResolvedValue({
      symbol: 'AAPL',
      price: 231.4,
      previousClose: 229,
      changePercent: 1.05,
      currency: 'USD',
      updatedAt: '',
    })
    vi.mocked(marketService.getPriceHistory).mockResolvedValue([])
  })

  it('con inversiones abre en las suyas; sin ellas, en todo el mercado', async () => {
    renderPage([aapl])
    expect(await screen.findByText('Sin noticias de tus inversiones')).toBeInTheDocument()
    expect(feed).toHaveBeenCalledWith({ scope: 'mine', symbol: undefined }, expect.any(AbortSignal))
    expect(screen.getByText('Tus inversiones hoy')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ver todo el mercado' }))
    expect(await screen.findByRole('button', { name: 'Headline 1' })).toBeInTheDocument()
  })

  it('un activo de la nota filtra el mural y se puede quitar el filtro', async () => {
    renderPage([])
    await screen.findByRole('button', { name: 'Headline 1' })

    await userEvent.click(screen.getAllByRole('button', { name: 'Ver noticias de BTC-USD' })[0])
    await waitFor(() =>
      expect(feed).toHaveBeenLastCalledWith({ scope: 'market', symbol: 'BTC-USD' }, expect.any(AbortSignal)),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Quitar el filtro de símbolo' }))
    expect(screen.queryByText('Símbolo:')).not.toBeInTheDocument()
  })

  it('"Cargar más" agrega la pagina siguiente y desaparece al final', async () => {
    renderPage([])
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar más noticias' }))

    expect(await screen.findByRole('button', { name: 'Headline 3' })).toBeInTheDocument()
    expect(feed).toHaveBeenLastCalledWith({ scope: 'market', symbol: undefined, pageToken: 'p2' })
    expect(screen.queryByRole('button', { name: 'Cargar más noticias' })).not.toBeInTheDocument()
  })

  it('la nota abierta enlaza a la fuente en otra pestaña', async () => {
    renderPage([], '/portafolio/noticias?vista=lista')
    expect(await screen.findByText('Hoy')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Headline 2' }))

    const link = await screen.findByRole('link', { name: /Leer la nota completa/ })
    expect(link).toHaveAttribute('href', 'https://www.benzinga.com/2')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText('Activos mencionados')).toBeInTheDocument()
  })
})
