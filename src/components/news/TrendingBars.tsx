import { useState } from 'react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { formatSignedPercent } from '@/lib/market'
import { changeClass } from '@/lib/news'
import { cn } from '@/lib/utils'
import { marketService } from '@/services/marketService'
import { newsService } from '@/services/newsService'
import { SegmentButton, Segmented } from '@/components/filters/Segmented'
import { Skeleton } from '@/components/ui/skeleton'

type TrendSort = 'menciones' | 'variacion'
const SHOWN = 6

/** Los activos que mas nombran las noticias recientes, como barras que se pueden ordenar. */
export function TrendingBars({ active, onSymbol }: { active: string | undefined; onSymbol(symbol: string): void }) {
  const [sort, setSort] = useState<TrendSort>('menciones')
  const trending = useApiQuery(['news-trending'], (signal) => newsService.trending(signal))
  const ids = trending.data?.map((asset) => asset.assetId) ?? []
  const quotes = useApiQuery(['trending-quotes', ids], (signal) => marketService.quotes(ids, signal))

  const rows = (trending.data ?? []).map((asset) => ({
    ...asset,
    change: quotes.data?.find((quote) => quote.symbol === asset.symbol)?.changePercent ?? null,
  }))
  rows.sort((a, b) => (sort === 'menciones' ? b.mentions - a.mentions : Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0)))
  const top = rows.slice(0, SHOWN)
  const measure = (row: (typeof rows)[number]) => (sort === 'menciones' ? row.mentions : Math.abs(row.change ?? 0))
  const most = Math.max(1e-9, ...top.map(measure))

  return (
    <section aria-labelledby="noticias-tendencias" className="rounded-2xl border bg-card px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="noticias-tendencias" className="text-[15px] font-semibold">
            Tendencias de hoy
          </h2>
          <p className="text-[12.5px] text-muted-foreground">Los activos con más noticias recientes del mercado</p>
        </div>
        <Segmented label="Ordenar tendencias">
          <SegmentButton pressed={sort === 'menciones'} onClick={() => setSort('menciones')}>
            Menciones
          </SegmentButton>
          <SegmentButton pressed={sort === 'variacion'} onClick={() => setSort('variacion')}>
            Variación
          </SegmentButton>
        </Segmented>
      </div>
      {trending.error && !trending.data ? (
        <p className="mt-3 text-sm text-muted-foreground">No pudimos cargar las tendencias.</p>
      ) : !trending.data ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {Array.from({ length: SHOWN }, (_, i) => (
            <Skeleton key={i} className="h-7" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Ninguna noticia reciente nombra activos del catálogo.</p>
      ) : (
        <ol className="mt-3 grid gap-x-7 gap-y-1 md:grid-cols-2">
          {top.map((row, i) => (
            <li key={row.assetId}>
              <button
                type="button"
                aria-pressed={active === row.symbol}
                onClick={() => onSymbol(row.symbol)}
                className={cn(
                  'grid w-full grid-cols-[1.1rem_4.5rem_minmax(0,1fr)_4rem_4rem] items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-[13px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                  active === row.symbol && 'bg-accent',
                )}
              >
                <span className="text-xs text-muted-foreground">{i + 1}</span>
                <strong className="truncate font-semibold">{row.symbol}</strong>
                <span aria-hidden="true" className="h-2 rounded-full bg-border">
                  <span
                    className={cn(
                      'block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
                      sort === 'menciones' ? 'bg-accent-ink' : (row.change ?? 0) >= 0 ? 'bg-gain' : 'bg-loss',
                    )}
                    style={{ width: `${(measure(row) / most) * 100}%` }}
                  />
                </span>
                <span className="text-right text-muted-foreground tabular-nums">
                  {row.mentions} {row.mentions === 1 ? 'nota' : 'notas'}
                </span>
                <span className={cn('text-right tabular-nums', changeClass(row.change))}>{formatSignedPercent(row.change)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
