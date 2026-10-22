import { Link } from 'react-router'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import { formatSignedPercent } from '@/lib/market'
import { changeClass, formatNewsTime, sourceLabel, wasEdited } from '@/lib/news'
import type { NewsItem } from '@/types/news'
import { NewsCover } from '@/components/news/NewsCover'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface NewsDetailSheetProps {
  /** La ultima nota abierta; se conserva al cerrar para que no desaparezca durante la animacion. */
  news: NewsItem | null
  open: boolean
  onOpenChange(open: boolean): void
}

/** La nota abierta: resumen, activos que nombra y el enlace a la fuente. */
export function NewsDetailSheet({ news, open, onOpenChange }: NewsDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {news && (
          <>
            <SheetHeader className="gap-3 p-6 pb-4">
              <SheetDescription>
                {sourceLabel(news.source)} · publicada {formatNewsTime(news.publishedAt)}
                {wasEdited(news) && ` · actualizada ${formatNewsTime(news.updatedAt)}`}
                {news.author && ` · ${news.author}`}
              </SheetDescription>
              {news.imageUrl && <NewsCover news={news} className="h-44 w-full rounded-xl" />}
              <SheetTitle className="font-display text-3xl leading-tight font-normal">{news.headline}</SheetTitle>
            </SheetHeader>

            <div className="space-y-5 px-6">
              <p className="leading-relaxed text-foreground/85">
                {news.summary || 'Esta nota no trae resumen. Ábrela para leerla completa.'}
              </p>

              {news.assets.length > 0 && (
                <section aria-labelledby="nota-activos" className="space-y-2">
                  <h3 id="nota-activos" className="text-xs tracking-wider text-muted-foreground uppercase">
                    Activos mencionados
                  </h3>
                  <ul className="space-y-2">
                    {news.assets.map((asset) => (
                      <li key={asset.assetId}>
                        <Link
                          to={`/portafolio/mercado/${asset.assetId}`}
                          className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors hover:bg-muted/60"
                        >
                          <span className="font-mono font-medium">{asset.symbol}</span>
                          <span className="mr-auto truncate text-xs text-muted-foreground">{asset.name}</span>
                          {asset.changePercent !== null && (
                            <span className={`text-xs font-medium tabular-nums ${changeClass(asset.changePercent)}`}>
                              {formatSignedPercent(asset.changePercent)}
                            </span>
                          )}
                          <ChevronRight className="size-4 flex-none text-muted-foreground" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="rounded-xl bg-accent p-3 text-sm leading-relaxed">
                    Antes de operar, mira el gráfico de <strong>{news.assets[0].symbol}</strong>. Si ya subió o bajó
                    fuerte, la noticia probablemente ya está en el precio.
                  </p>
                </section>
              )}
            </div>

            {news.url && (
              <SheetFooter className="gap-2 p-6">
                <Button asChild size="lg" className="h-11">
                  <a href={news.url} target="_blank" rel="noopener noreferrer">
                    Leer la nota completa
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Se abre en {sourceLabel(news.source)}, en otra pestaña. Está en inglés.
                </p>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
