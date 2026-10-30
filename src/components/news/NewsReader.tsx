import { Link } from 'react-router'
import { formatSignedPercent } from '@/lib/market'
import { changeClass, formatNewsTime, sourceLabel, wasEdited } from '@/lib/news'
import type { NewsAsset, NewsItem } from '@/types/news'
import { Button } from '@/components/ui/button'
import { NewsCover } from './NewsCover'
import { SaveButton, SourceLink } from './NewsList'

interface NewsReaderProps {
  news: NewsItem | undefined
  heldIds: number[]
  saved: boolean
  onToggleSave(news: NewsItem): void
  onTrade(asset: NewsAsset): void
}

/** La nota elegida, para leerla sin salir del mural. */
export function NewsReader({ news, heldIds, saved, onToggleSave, onTrade }: NewsReaderProps) {
  if (!news) {
    return (
      <aside className="rounded-2xl border bg-card px-5.5 py-7 text-[13px] text-muted-foreground lg:sticky lg:top-20">
        Elige una noticia para leerla aquí.
      </aside>
    )
  }

  return (
    <aside aria-labelledby="noticia-lectura" className="overflow-hidden rounded-2xl border bg-card lg:sticky lg:top-20">
      <NewsCover news={news} className="h-36 w-full" textClassName="text-6xl font-display" />
      <div className="p-5">
        <p className="text-xs text-muted-foreground">
          {sourceLabel(news.source)}
          {news.author && ` · ${news.author}`}
        </p>
        <h2 id="noticia-lectura" lang="en" className="mt-2 text-[19px] leading-snug font-semibold">
          {news.headline}
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Publicada {formatNewsTime(news.publishedAt)}
          {wasEdited(news) && ` · actualizada ${formatNewsTime(news.updatedAt)}`}
        </p>
        <p lang="en" className="mt-3 text-[13.5px] leading-relaxed">
          {news.summary || 'Esta nota no trae resumen. Ábrela para leerla completa.'}
        </p>

        {news.assets.length > 0 && (
          <>
            <h3 className="mt-4 text-xs tracking-wider text-muted-foreground uppercase">Activos de la noticia</h3>
            <ul className="mt-2">
              {news.assets.map((asset) => (
                <li key={asset.assetId} className="flex items-center justify-between gap-2.5 border-t py-2 text-[13px]">
                  <Link to={`/portafolio/mercado/${asset.assetId}`} className="min-w-0 truncate underline-offset-4 hover:underline">
                    <strong>{asset.symbol}</strong> <span className="text-muted-foreground">{asset.name}</span>
                    {heldIds.includes(asset.assetId) && <span className="text-[11.5px] text-accent-ink"> · en tu portafolio</span>}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2.5">
                    <span className={changeClass(asset.changePercent)}>{formatSignedPercent(asset.changePercent)}</span>
                    <Button size="xs" variant="outline" onClick={() => onTrade(asset)}>
                      Operar
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-3.5 flex gap-2">
          {news.url && <SourceLink news={news} className="flex-1" />}
          <SaveButton saved={saved} onClick={() => onToggleSave(news)} className="flex-1" />
        </div>
      </div>
    </aside>
  )
}
