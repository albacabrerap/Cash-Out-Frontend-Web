import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { LayoutGrid, List, X } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { isNewsScope, NEWS_SCOPES } from '@/lib/news'
import { portfolioService } from '@/services/portfolioService'
import type { NewsItem, NewsScope } from '@/types/news'
import { HoldingsStrip } from '@/components/news/HoldingsStrip'
import { NewsDetailSheet } from '@/components/news/NewsDetailSheet'
import { NewsFeed, type NewsView } from '@/components/news/NewsFeed'
import { NewsTips, TrendingCard } from '@/components/news/NewsSidebar'
import { PortfolioHeader } from '@/components/portfolio/PortfolioHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export default function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const portfolio = useApiQuery(['portfolio'], (signal) => portfolioService.get(signal))
  const [selected, setSelected] = useState<NewsItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const positions = portfolio.data?.positions ?? []
  const scopeParam = searchParams.get('alcance')
  const symbol = searchParams.get('simbolo') ?? undefined
  const view: NewsView = searchParams.get('vista') === 'lista' ? 'lista' : 'grilla'
  // Sin alcance en la URL se espera al portafolio: con inversiones se abre en las suyas.
  let scope: NewsScope | undefined = isNewsScope(scopeParam) ? scopeParam : undefined
  if (!scope && portfolio.data) scope = positions.length > 0 ? 'mine' : 'market'
  if (!scope && portfolio.error) scope = 'market'

  const update = (changes: Record<string, string | undefined>) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value) params.set(key, value)
          else params.delete(key)
        }
        return params
      },
      { replace: true, preventScrollReset: true },
    )
  const setSymbol = (next: string | undefined) => update({ simbolo: next })
  const setScope = (next: NewsScope) => update({ alcance: next, simbolo: undefined })
  const open = (news: NewsItem) => {
    setSelected(news)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      <PortfolioHeader />

      <div>
        <h2 className="font-display text-4xl leading-none">
          Lo que mueve <em className="text-accent-ink">el mercado</em>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Noticias de Benzinga vía Alpaca, en inglés tal como se publicaron. Se renuevan cada 5 minutos.
        </p>
      </div>

      {positions.length > 0 && <HoldingsStrip positions={positions} active={symbol} onSymbol={setSymbol} />}

      <div className="flex flex-wrap items-center gap-2.5">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={symbol ? '' : (scope ?? '')}
          onValueChange={(value) => isNewsScope(value) && setScope(value)}
          aria-label="Qué noticias ver"
        >
          {NEWS_SCOPES.map(({ key, label }) => (
            <ToggleGroupItem key={key} value={key} className="px-3">
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {symbol && (
          <span className="flex items-center gap-1.5 rounded-lg border border-accent-ink/50 bg-accent py-1 pr-1 pl-3 text-sm">
            Símbolo: <strong className="font-mono">{symbol}</strong>
            <button
              type="button"
              onClick={() => setSymbol(undefined)}
              aria-label="Quitar el filtro de símbolo"
              className="grid size-6 place-items-center rounded-md outline-none hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        )}
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={view}
          onValueChange={(value) => value && update({ vista: value === 'lista' ? 'lista' : undefined })}
          aria-label="Vista"
          className="ml-auto"
        >
          <ToggleGroupItem value="grilla" aria-label="Vista en grilla">
            <LayoutGrid aria-hidden="true" />
          </ToggleGroupItem>
          <ToggleGroupItem value="lista" aria-label="Vista en lista">
            <List aria-hidden="true" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          {scope ? (
            <NewsFeed
              scope={scope}
              symbol={symbol}
              view={view}
              hasPositions={positions.length > 0}
              onOpen={open}
              onSymbol={setSymbol}
              onScope={setScope}
            />
          ) : (
            <Skeleton className="h-64 w-full rounded-2xl" />
          )}
        </div>
        <aside className="space-y-4" aria-label="Contexto de las noticias">
          <TrendingCard active={symbol} onSymbol={setSymbol} />
          <NewsTips />
        </aside>
      </div>

      <NewsDetailSheet news={selected} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  )
}
