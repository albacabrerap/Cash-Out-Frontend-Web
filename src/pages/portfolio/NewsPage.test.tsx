import { render, screen, waitFor, within } from '@testing-library/react'
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
vi.mock('@/services/marketService', () => ({ marketService: { quotes: vi.fn() } }))
const media = vi.hoisted(() => ({ wide: true }))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => media.wide }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const feed = vi.mocked(newsService.feed)
// El mural espera al portafolio y despues a la primera pagina: con la suite en paralelo pasa del segundo.
const FIRST_LOAD = { timeout: 3000 }

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
    media.wide = true
    localStorage.clear()
    feed.mockReset()
    feed.mockImplementation(async ({ scope, pageToken }): Promise<Page> =>
      scope === 'mine' && !pageToken
        ? { items: [], nextPageToken: null }
        : pageToken
          ? { items: [news(3)], nextPageToken: null }
          : { items: [news(1), news(2)], nextPageToken: 'p2' },
    )
    vi.mocked(newsService.trending).mockResolvedValue([
      { assetId: 7, symbol: 'AAPL', name: 'Apple', mentions: 4 },
      { assetId: 8, symbol: 'TSLA', name: 'Tesla', mentions: 1 },
    ])
    vi.mocked(marketService.quotes).mockResolvedValue([
      { symbol: 'AAPL', price: 231.4, previousClose: 229, changePercent: 1.05, currency: 'USD', updatedAt: '' },
      { symbol: 'TSLA', price: 400, previousClose: 420, changePercent: -4.76, currency: 'USD', updatedAt: '' },
    ])
  })

  it('con inversiones abre en las suyas; sin ellas, en todo el mercado', async () => {
    renderPage([aapl])
    expect(await screen.findByText('Sin noticias de tus inversiones', {}, FIRST_LOAD)).toBeInTheDocument()
    expect(feed).toHaveBeenCalledWith({ scope: 'mine', symbol: undefined }, expect.any(AbortSignal))
    expect(feed).not.toHaveBeenCalledWith(expect.objectContaining({ scope: 'market' }), expect.anything())
    expect(await screen.findByRole('button', { name: 'AAPL +1.05 %' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ver todo el mercado' }))
    expect(await screen.findByRole('button', { name: /Headline 1/ })).toBeInTheDocument()
  })

  it('un activo de la nota filtra el mural y se puede quitar el filtro', async () => {
    renderPage([])
    await screen.findByRole('button', { name: /Headline 1/ }, FIRST_LOAD)

    await userEvent.click(screen.getAllByRole('button', { name: 'Ver noticias de BTC-USD' })[0])
    await waitFor(() =>
      expect(feed).toHaveBeenLastCalledWith({ scope: 'market', symbol: 'BTC-USD' }, expect.any(AbortSignal)),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Quitar el filtro de símbolo' }))
    expect(screen.queryByText('Símbolo:')).not.toBeInTheDocument()
  })

  it('"Cargar más" agrega la pagina siguiente y desaparece al final', async () => {
    renderPage([])
    await userEvent.click(await screen.findByRole('button', { name: 'Cargar más noticias' }, FIRST_LOAD))

    expect(await screen.findByRole('button', { name: /Headline 3/ })).toBeInTheDocument()
    expect(feed).toHaveBeenLastCalledWith({ scope: 'market', symbol: undefined, pageToken: 'p2' })
    expect(screen.queryByRole('button', { name: 'Cargar más noticias' })).not.toBeInTheDocument()
  })

  it('la nota elegida se lee en el panel y enlaza a la fuente en otra pestaña', async () => {
    renderPage([])
    await userEvent.click(await screen.findByRole('button', { name: /Headline 2/ }, FIRST_LOAD))

    const reader = screen.getByRole('complementary', { name: 'Headline 2' })
    const link = within(reader).getByRole('link', { name: /Leer en Benzinga/ })
    expect(link).toHaveAttribute('href', 'https://www.benzinga.com/2')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(reader).getByText('Summary 2')).toBeInTheDocument()
  })

  it('guardar una nota la deja en Guardadas', async () => {
    renderPage([])
    await screen.findByRole('complementary', { name: 'Headline 1' }, FIRST_LOAD)

    await userEvent.click(within(screen.getByRole('complementary')).getByRole('button', { name: 'Guardar' }))
    await userEvent.click(screen.getByRole('button', { name: /Guardadas · 1/ }))

    expect(screen.getByText('1 noticia guardada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Headline 2/ })).not.toBeInTheDocument()
  })

  it('las tendencias se ordenan por variacion', async () => {
    renderPage([])
    const trends = await screen.findByRole('region', { name: 'Tendencias de hoy' })
    await within(trends).findByText('−4.76 %', {}, FIRST_LOAD)
    expect(within(trends).getAllByRole('listitem')[0]).toHaveTextContent('AAPL')

    await userEvent.click(within(trends).getByRole('button', { name: 'Variación' }))
    expect(within(trends).getAllByRole('listitem')[0]).toHaveTextContent('TSLA')
  })

  it('en el celular la nota se despliega en la lista', async () => {
    media.wide = false
    renderPage([])
    const headline = await screen.findByRole('button', { name: /Headline 1/ }, FIRST_LOAD)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    await userEvent.click(headline)
    expect(headline).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Summary 1')).toBeInTheDocument()
  })
})
