import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { NewsItem } from '@/types/news'
import { newsService } from '@/services/newsService'
import { AssetNews } from './AssetNews'

vi.mock('@/services/newsService', () => ({ newsService: { feed: vi.fn() } }))

const feed = vi.mocked(newsService.feed)

const news = (id: number): NewsItem => {
  const publishedAt = new Date(Date.now() - id * 3_600_000).toISOString()
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
    assets: [{ assetId: 7, symbol: 'AAPL', name: 'Apple', changePercent: 0.43 }],
  }
}

function renderSection() {
  const router = createMemoryRouter([{ path: '/', element: <AssetNews symbol="AAPL" /> }])
  render(<RouterProvider router={router} />)
}

describe('AssetNews', () => {
  beforeEach(() => feed.mockReset())

  it('muestra las cinco notas mas recientes del activo y enlaza al mural filtrado', async () => {
    feed.mockResolvedValue({ items: Array.from({ length: 8 }, (_, i) => news(i + 1)), nextPageToken: 'p2' })
    renderSection()

    expect(await screen.findByRole('button', { name: 'Headline 1' })).toBeInTheDocument()
    expect(feed).toHaveBeenCalledWith({ scope: 'market', symbol: 'AAPL' }, expect.any(AbortSignal))
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('hace 2 h')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute(
      'href',
      '/portafolio/noticias?alcance=market&simbolo=AAPL',
    )
  })

  it('abre la nota en el panel lateral', async () => {
    feed.mockResolvedValue({ items: [news(1)], nextPageToken: null })
    renderSection()

    await userEvent.click(await screen.findByRole('button', { name: 'Headline 1' }))

    expect(await screen.findByRole('link', { name: /Leer la nota completa/ })).toHaveAttribute(
      'href',
      'https://www.benzinga.com/1',
    )
  })

  it('sin notas lo dice y no ofrece ir al mural', async () => {
    feed.mockResolvedValue({ items: [], nextPageToken: null })
    renderSection()

    expect(await screen.findByText('Ninguna nota reciente menciona AAPL.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver todas' })).not.toBeInTheDocument()
  })
})
