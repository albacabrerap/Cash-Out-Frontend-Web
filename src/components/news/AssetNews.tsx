import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { newsService } from '@/services/newsService'
import type { NewsItem } from '@/types/news'
import { NewsRow } from '@/components/news/NewsCards'
import { NewsDetailSheet } from '@/components/news/NewsDetailSheet'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const SHOWN = 5

/** Las ultimas notas que nombran al activo; el resto queda en el mural. */
export function AssetNews({ symbol }: { symbol: string }) {
  const news = useApiQuery(['news', 'market', symbol], (signal) => newsService.feed({ scope: 'market', symbol }, signal))
  const [selected, setSelected] = useState<NewsItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const items = news.data?.items.slice(0, SHOWN)

  const open = (item: NewsItem) => {
    setSelected(item)
    setDetailOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Noticias de {symbol}</h2>
        </CardTitle>
        <CardDescription>En inglés, tal como las publica Benzinga.</CardDescription>
        {items && items.length > 0 && (
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link to={`/portafolio/noticias?alcance=market&simbolo=${encodeURIComponent(symbol)}`}>
                Ver todas
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {news.error && !news.data ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            No pudimos traer las noticias ahora.
            {news.error.retryable && (
              <Button variant="outline" size="sm" onClick={news.reload}>
                Reintentar
              </Button>
            )}
          </div>
        ) : !items ? (
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguna nota reciente menciona {symbol}.</p>
        ) : (
          <ul className="overflow-hidden rounded-xl border">
            {items.map((item) => (
              <NewsRow key={item.id} news={item} onOpen={open} relativeTime />
            ))}
          </ul>
        )}
      </CardContent>
      <NewsDetailSheet news={selected} open={detailOpen} onOpenChange={setDetailOpen} />
    </Card>
  )
}
