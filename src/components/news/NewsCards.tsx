import { formatSignedPercent } from '@/lib/market'
import { changeClass, formatNewsClock, formatNewsStamp, sourceLabel } from '@/lib/news'
import type { NewsAsset, NewsItem } from '@/types/news'
import { NewsCover } from '@/components/news/NewsCover'
import { cn } from '@/lib/utils'

interface CardProps {
  news: NewsItem
  onOpen(news: NewsItem): void
  onSymbol(symbol: string): void
}

function Meta({ news }: { news: NewsItem }) {
  return (
    <p className="text-xs text-muted-foreground">
      {sourceLabel(news.source)} · <time dateTime={news.updatedAt}>{formatNewsStamp(news)}</time>
    </p>
  )
}

/** Filtra el mural por ese activo. Va encima del boton que cubre la tarjeta. */
function AssetChip({ asset, onSymbol }: { asset: NewsAsset; onSymbol(symbol: string): void }) {
  return (
    <button
      type="button"
      onClick={() => onSymbol(asset.symbol)}
      aria-label={`Ver noticias de ${asset.symbol}`}
      className="relative z-10 rounded-md border bg-muted px-2 py-0.5 font-mono text-xs transition-colors hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {asset.symbol}
      {asset.changePercent !== null && (
        <span className={cn('ml-1', changeClass(asset.changePercent))}>{formatSignedPercent(asset.changePercent)}</span>
      )}
    </button>
  )
}

function Chips({ news, onSymbol }: Pick<CardProps, 'news' | 'onSymbol'>) {
  if (news.assets.length === 0) return null
  return (
    <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
      {news.assets.map((asset) => (
        <AssetChip key={asset.assetId} asset={asset} onSymbol={onSymbol} />
      ))}
    </div>
  )
}

// El titular es el boton; su ::after cubre la tarjeta para que todo sea clicable sin anidar botones.
const STRETCHED =
  'text-left outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring'
const CARD = 'group relative overflow-hidden rounded-2xl border bg-card transition-[border-color,translate] hover:-translate-y-0.5 hover:border-foreground/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0'

export function NewsFeatured({ news, onOpen, onSymbol }: CardProps) {
  return (
    <article className={cn(CARD, 'grid md:grid-cols-[1.05fr_1fr]')}>
      <div className="relative min-h-52 md:min-h-64">
        <NewsCover news={news} className="absolute inset-0 size-full" textClassName="left-4 right-auto text-6xl" />
        <span className="absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white">
          Destacada
        </span>
      </div>
      <div className="flex flex-col gap-2.5 p-5 md:p-6">
        <Meta news={news} />
        <h3>
          <button type="button" onClick={() => onOpen(news)} className={cn(STRETCHED, 'font-display text-3xl leading-tight')}>
            {news.headline}
          </button>
        </h3>
        {news.summary && <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">{news.summary}</p>}
        <Chips news={news} onSymbol={onSymbol} />
      </div>
    </article>
  )
}

export function NewsCard({ news, onOpen, onSymbol }: CardProps) {
  return (
    <article className={cn(CARD, 'flex flex-col')}>
      {news.imageUrl && <NewsCover news={news} className="h-32 w-full" textClassName="text-4xl" />}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Meta news={news} />
        <h3>
          <button type="button" onClick={() => onOpen(news)} className={cn(STRETCHED, 'leading-snug font-semibold')}>
            {news.headline}
          </button>
        </h3>
        {news.summary && <p className="line-clamp-3 text-sm text-muted-foreground">{news.summary}</p>}
        <Chips news={news} onSymbol={onSymbol} />
      </div>
    </article>
  )
}

interface NewsRowProps extends Omit<CardProps, 'onSymbol'> {
  /** Sin encabezados por dia, la hora sola no dice de que dia es la nota. */
  relativeTime?: boolean
}

export function NewsRow({ news, onOpen, relativeTime = false }: NewsRowProps) {
  const symbols = news.assets.map((asset) => asset.symbol).join(' · ')
  return (
    <li className="relative flex items-center gap-3.5 border-t px-4 py-3 transition-colors first:border-t-0 hover:bg-muted/50">
      <NewsCover news={news} className="size-9 flex-none rounded-lg" textClassName="hidden" />
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => onOpen(news)} className={cn(STRETCHED, 'block w-full truncate text-sm font-medium')}>
          {news.headline}
        </button>
        <p className="truncate text-xs text-muted-foreground">
          {symbols && <span className="font-mono">{symbols} · </span>}
          {sourceLabel(news.source)}
        </p>
      </div>
      <time dateTime={news.updatedAt} className="flex-none text-xs text-muted-foreground tabular-nums">
        {relativeTime ? formatNewsStamp(news) : formatNewsClock(news.updatedAt)}
      </time>
    </li>
  )
}
