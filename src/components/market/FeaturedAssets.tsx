import { formatSignedPercent, formatUsd } from '@/lib/market'
import { cn } from '@/lib/utils'
import type { Asset, AssetQuote, PricePoint } from '@/types/market'
import { Skeleton } from '@/components/ui/skeleton'

export interface FeaturedAsset {
  asset: Asset
  quote: AssetQuote | undefined
  /** Cierres del ultimo mes. */
  points: PricePoint[]
}

interface FeaturedAssetsProps {
  items: FeaturedAsset[] | undefined
  selectedId: number | undefined
  /** En pantalla ancha elige el activo del panel; en el celular abre su pagina. */
  onSelect: (asset: Asset) => void
}

/** Un vistazo al mercado: los indices y las cripto mas conocidas, con su mes. */
export function FeaturedAssets({ items, selectedId, onSelect }: FeaturedAssetsProps) {
  if (!items) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    )
  }
  if (items.length === 0) return null

  return (
    <section aria-label="Destacados" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ asset, quote, points }) => {
        const first = points[0]?.closePrice
        const last = points.at(-1)?.closePrice
        const month = first && last ? ((last - first) / first) * 100 : null
        const trend = (month ?? 0) >= 0 ? 'var(--gain)' : 'var(--loss)'
        const day = quote?.changePercent ?? null
        return (
          <button
            key={asset.id}
            type="button"
            aria-pressed={asset.id === selectedId}
            onClick={() => onSelect(asset)}
            className={cn(
              'min-w-0 rounded-2xl border bg-card px-4 pt-3.5 pb-3 text-left outline-none transition-[border-color,box-shadow] hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring',
              asset.id === selectedId && 'border-accent-ink ring-3 ring-accent-ink/20',
            )}
          >
            <span className="flex items-baseline justify-between gap-2">
              <strong className="text-[13.5px] font-semibold">{asset.symbol}</strong>
              {day !== null && (
                <span className={cn('text-xs tabular-nums', day >= 0 ? 'text-gain' : 'text-loss')}>{formatSignedPercent(day)}</span>
              )}
            </span>
            <span className="block truncate text-[11.5px] text-muted-foreground">{asset.name}</span>
            <span className="mt-2 block font-mono text-lg font-medium tabular-nums">{formatUsd(quote?.price)}</span>
            {points.length > 1 ? (
              <Sparkline values={points.map((point) => point.closePrice)} color={trend} />
            ) : (
              <span className="mt-1.5 block h-10" />
            )}
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {month === null ? 'Sin cierres del mes' : `${formatSignedPercent(month)} en el mes`}
            </span>
          </button>
        )
      })}
    </section>
  )
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const line = values
    .map((value, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * 100).toFixed(2)} ${(3 + (1 - (value - min) / span) * 34).toFixed(2)}`)
    .join(' ')
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-1.5 block h-10 w-full" aria-hidden="true">
      <path d={`${line} L100 40 L0 40 Z`} fill={color} fillOpacity={0.1} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
