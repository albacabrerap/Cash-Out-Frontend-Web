import { Newspaper } from 'lucide-react'
import { useNewsFeed } from '@/hooks/useNewsFeed'
import { groupNewsByDay } from '@/lib/news'
import type { NewsItem, NewsScope } from '@/types/news'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { NewsCard, NewsFeatured, NewsRow } from '@/components/news/NewsCards'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type NewsView = 'grilla' | 'lista'

interface NewsFeedProps {
  scope: NewsScope
  symbol: string | undefined
  view: NewsView
  hasPositions: boolean
  onOpen(news: NewsItem): void
  onSymbol(symbol: string | undefined): void
  onScope(scope: NewsScope): void
}

export function NewsFeed({ scope, symbol, view, hasPositions, onOpen, onSymbol, onScope }: NewsFeedProps) {
  const feed = useNewsFeed(scope, symbol)

  if (feed.error && !feed.items) {
    return <ErrorState error={feed.error} onRetry={feed.reload} title="No pudimos traer las noticias" />
  }
  if (!feed.items) return <FeedSkeleton />
  if (feed.items.length === 0) {
    return <EmptyFeed scope={scope} symbol={symbol} hasPositions={hasPositions} onSymbol={onSymbol} onScope={onScope} />
  }

  const [featured, ...rest] = feed.items
  return (
    <div aria-busy={feed.isRefreshing} className={cn('space-y-4 transition-opacity', feed.isRefreshing && 'opacity-60')}>
      {view === 'grilla' ? (
        <>
          <NewsFeatured news={featured} onOpen={onOpen} onSymbol={onSymbol} />
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.map((news) => (
              <NewsCard key={news.id} news={news} onOpen={onOpen} onSymbol={onSymbol} />
            ))}
          </div>
        </>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          {groupNewsByDay(feed.items).map((group) => (
            <section key={group.label} aria-label={group.label} className="border-t first:border-t-0">
              <h3 className="bg-muted/50 px-4 pt-3 pb-1.5 text-xs text-muted-foreground">{group.label}</h3>
              <ul>
                {group.items.map((news) => (
                  <NewsRow key={news.id} news={news} onOpen={onOpen} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {feed.hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void feed.loadMore()} disabled={feed.isLoadingMore}>
            {feed.isLoadingMore ? 'Cargando…' : 'Cargar más noticias'}
          </Button>
        </div>
      )}
    </div>
  )
}

function EmptyFeed({
  scope,
  symbol,
  hasPositions,
  onSymbol,
  onScope,
}: Pick<NewsFeedProps, 'scope' | 'symbol' | 'hasPositions' | 'onSymbol' | 'onScope'>) {
  if (symbol) {
    return (
      <EmptyState
        icon={Newspaper}
        title={`Sin noticias recientes de ${symbol}`}
        description="Ninguna nota reciente lo menciona."
        action={
          <Button variant="outline" onClick={() => onSymbol(undefined)}>
            Quitar el filtro
          </Button>
        }
      />
    )
  }
  if (scope === 'mine') {
    return (
      <EmptyState
        icon={Newspaper}
        title={hasPositions ? 'Sin noticias de tus inversiones' : 'Todavía no tienes inversiones'}
        description={
          hasPositions
            ? 'Ninguna nota reciente menciona lo que tienes.'
            : 'Cuando compres una acción o una cripto, aquí vas a ver las noticias que la mencionan.'
        }
        action={<Button onClick={() => onScope('market')}>Ver todo el mercado</Button>}
      />
    )
  }
  return <EmptyState icon={Newspaper} title="No hay noticias por ahora" description="Vuelve en unos minutos." />
}

function FeedSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
