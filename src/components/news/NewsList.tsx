import type { ReactNode } from 'react'
import { ArrowUpRight, Star } from 'lucide-react'
import { formatSignedPercent } from '@/lib/market'
import { changeClass, formatNewsStamp, groupNewsByDay, sourceLabel } from '@/lib/news'
import { cn } from '@/lib/utils'
import type { NewsItem } from '@/types/news'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface NewsListProps {
  items: NewsItem[] | undefined
  selectedId: number | undefined
  /** En el celular la nota se despliega en la lista; en pantalla ancha se lee en el panel. */
  inline: boolean
  onSelect(news: NewsItem): void
  isSaved(id: number): boolean
  onToggleSave(news: NewsItem): void
  onSymbol(symbol: string): void
  empty: ReactNode
  footer?: ReactNode
  busy?: boolean
}

/** Las noticias agrupadas por dia; elegir una la abre. */
export function NewsList({ items, selectedId, inline, onSelect, isSaved, onToggleSave, onSymbol, empty, footer, busy }: NewsListProps) {
  return (
    <section aria-labelledby="noticias-lista" className="min-w-0 overflow-hidden rounded-2xl border bg-card">
      <h2 id="noticias-lista" className="sr-only">
        Noticias
      </h2>
      {!items ? (
        <div aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2 border-t px-4.5 py-3.5 first:border-t-0">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        empty
      ) : (
        <div aria-busy={busy} className={cn('transition-opacity', busy && 'opacity-60')}>
          {groupNewsByDay(items).map((group) => (
            <div key={group.label}>
              <h3 className="px-4.5 pt-3 pb-1.5 text-[11px] tracking-wider text-muted-foreground uppercase">{group.label}</h3>
              <ul>
                {group.items.map((news) => {
                  const selected = news.id === selectedId
                  const open = inline && selected
                  return (
                    <li
                      key={news.id}
                      className={cn('border-t', selected && 'bg-muted/60 shadow-[inset_3px_0_0_var(--accent-ink)]')}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(news)}
                        aria-expanded={inline ? open : undefined}
                        aria-pressed={inline ? undefined : selected}
                        className="block w-full px-4.5 pt-3 pb-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        <span className="flex justify-between gap-2.5 text-[11.5px] text-muted-foreground">
                          <span>
                            {sourceLabel(news.source)} · {formatNewsStamp(news)}
                          </span>
                          {isSaved(news.id) && <span className="text-accent-ink">★ guardada</span>}
                        </span>
                        <span lang="en" className="mt-1 block text-[14.5px] leading-snug font-semibold">
                          {news.headline}
                        </span>
                      </button>
                      <NewsAssetChips news={news} onSymbol={onSymbol} className="px-4.5 pb-3" />
                      {open && (
                        <div className="animate-in px-4.5 pb-3.5 duration-200 fade-in">
                          <p lang="en" className="text-[13px] leading-relaxed text-muted-foreground">
                            {news.summary || 'Esta nota no trae resumen. Ábrela para leerla completa.'}
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <SaveButton saved={isSaved(news.id)} onClick={() => onToggleSave(news)} />
                            {news.url && <SourceLink news={news} variant="outline" />}
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {footer}
        </div>
      )}
    </section>
  )
}

export function NewsAssetChips({ news, onSymbol, className }: { news: NewsItem; onSymbol(symbol: string): void; className?: string }) {
  if (news.assets.length === 0) return null
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {news.assets.map((asset) => (
        <button
          key={asset.assetId}
          type="button"
          onClick={() => onSymbol(asset.symbol)}
          aria-label={`Ver noticias de ${asset.symbol}`}
          className="rounded-full border px-2 py-px text-[11px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          {asset.symbol}{' '}
          {asset.changePercent !== null && (
            <span className={changeClass(asset.changePercent)}>{formatSignedPercent(asset.changePercent)}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function SaveButton({ saved, onClick, className }: { saved: boolean; onClick(): void; className?: string }) {
  return (
    <Button size="sm" variant="outline" aria-pressed={saved} onClick={onClick} className={className}>
      <Star aria-hidden="true" className={cn(saved && 'fill-current text-accent-ink')} />
      {saved ? 'Guardada' : 'Guardar'}
    </Button>
  )
}

export function SourceLink({ news, variant = 'default', className }: { news: NewsItem; variant?: 'default' | 'outline'; className?: string }) {
  return (
    <Button asChild size="sm" variant={variant} className={className}>
      <a href={news.url ?? undefined} target="_blank" rel="noopener noreferrer">
        Leer en {sourceLabel(news.source)}
        <ArrowUpRight aria-hidden="true" />
      </a>
    </Button>
  )
}
