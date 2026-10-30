import { formatNewsClock, formatNewsStamp, sourceLabel } from '@/lib/news'
import type { NewsItem } from '@/types/news'
import { NewsCover } from '@/components/news/NewsCover'

interface NewsRowProps {
  news: NewsItem
  onOpen(news: NewsItem): void
  /** Sin encabezados por dia, la hora sola no dice de que dia es la nota. */
  relativeTime?: boolean
}

export function NewsRow({ news, onOpen, relativeTime = false }: NewsRowProps) {
  const symbols = news.assets.map((asset) => asset.symbol).join(' · ')
  return (
    <li className="relative flex items-center gap-3.5 border-t px-4 py-3 transition-colors first:border-t-0 hover:bg-muted/50">
      <NewsCover news={news} className="size-9 flex-none rounded-lg" textClassName="hidden" />
      <div className="min-w-0 flex-1">
        {/* El ::after del titular cubre la fila para que toda sea clicable. */}
        <button
          type="button"
          onClick={() => onOpen(news)}
          className="block w-full truncate text-left text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
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
