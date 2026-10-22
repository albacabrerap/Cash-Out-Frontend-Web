import { useApiQuery } from '@/hooks/useApiQuery'
import { formatSignedPercent, formatUsd } from '@/lib/market'
import { changeClass, sparklinePath } from '@/lib/news'
import { marketService } from '@/services/marketService'
import type { Position } from '@/types/market'
import { cn } from '@/lib/utils'

const SPARK_WIDTH = 84
const SPARK_HEIGHT = 34
const SPARK_DAYS = 30

interface HoldingsStripProps {
  positions: readonly Position[]
  active: string | undefined
  onSymbol(symbol: string | undefined): void
}

/** Las cuatro posiciones mas grandes; tocar una filtra el mural por ese activo. */
export function HoldingsStrip({ positions, active, onSymbol }: HoldingsStripProps) {
  const top = [...positions].sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0)).slice(0, 4)
  return (
    <section aria-labelledby="mural-inversiones" className="space-y-2">
      <h2 id="mural-inversiones" className="text-xs tracking-wider text-muted-foreground uppercase">
        Tus inversiones hoy
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {top.map((position) => (
          <HoldingCard
            key={position.assetId}
            position={position}
            active={active === position.symbol}
            onToggle={() => onSymbol(active === position.symbol ? undefined : position.symbol)}
          />
        ))}
      </div>
    </section>
  )
}

function HoldingCard({ position, active, onToggle }: { position: Position; active: boolean; onToggle(): void }) {
  const quote = useApiQuery(['quote', position.assetId], (signal) => marketService.getQuote(position.assetId, signal))
  const history = useApiQuery(['history', position.assetId], (signal) =>
    marketService.getPriceHistory(position.assetId, signal),
  )
  const change = quote.data?.changePercent
  const closes = history.data?.slice(-SPARK_DAYS).map((point) => point.closePrice) ?? []

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-2xl border bg-card px-4 py-3.5 text-left transition-colors outline-none hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring',
        active && 'border-accent-ink bg-accent/40',
      )}
    >
      <span className="truncate text-xs text-muted-foreground">
        {position.symbol} · {position.assetName}
      </span>
      <svg
        viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
        width={SPARK_WIDTH}
        height={SPARK_HEIGHT}
        aria-hidden="true"
        className={cn('row-span-2 max-sm:hidden', changeClass(change))}
      >
        <path
          d={sparklinePath(closes, SPARK_WIDTH, SPARK_HEIGHT)}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-lg font-medium tabular-nums">{formatUsd(quote.data?.price ?? position.currentPrice)}</span>
      <span className={cn('col-span-full text-xs font-medium sm:col-span-1', changeClass(change))}>
        {formatSignedPercent(change)} hoy
      </span>
    </button>
  )
}
