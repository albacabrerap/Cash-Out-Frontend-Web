import type { RangeReturn } from '@/lib/assetStats'
import type { ChartRange } from '@/lib/chartRanges'
import { formatSignedPercent } from '@/lib/market'
import { cn } from '@/lib/utils'

const LABELS: Record<ChartRange, string> = { '1M': '1 mes', '3M': '3 meses', '6M': '6 meses', '1A': '1 año', '5A': '5 años' }
const KEYS = Object.keys(LABELS) as ChartRange[]

interface AssetReturnsProps {
  /** undefined mientras carga el historial. */
  returns: RangeReturn[] | undefined
  range: ChartRange
  onRangeChange(range: ChartRange): void
}

/** Cuanto rindio el activo en cada periodo, junto al S&P 500; tocar uno lo abre en el grafico. */
export function AssetReturns({ returns, range, onRangeChange }: AssetReturnsProps) {
  return (
    <section aria-labelledby="activo-rendimiento" className="rounded-2xl border bg-card px-5 py-4">
      <h2 id="activo-rendimiento" className="text-xs tracking-wider text-muted-foreground uppercase">
        Cuánto rindió
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-y-3 sm:grid-cols-5">
        {KEYS.map((key, i) => {
          const item = returns?.find((r) => r.range === key)
          const pressed = range === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={pressed}
              onClick={() => onRangeChange(key)}
              className={cn(
                'rounded-lg px-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-none',
                i > 0 && 'sm:border-l',
              )}
            >
              <span className={cn('block text-xs text-muted-foreground', pressed && 'font-medium text-foreground')}>{LABELS[key]}</span>
              {!item ? (
                <span className="mt-1 inline-block h-5 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <span
                  className={cn(
                    'mt-0.5 block text-lg font-semibold tabular-nums',
                    item.value === null ? 'text-muted-foreground' : item.value >= 0 ? 'text-gain' : 'text-loss',
                  )}
                >
                  {item.value === null ? '—' : formatSignedPercent(item.value)}
                </span>
              )}
              {item && item.benchmark !== null && (
                <span className="block text-[11.5px] text-muted-foreground tabular-nums">S&amp;P 500 {formatSignedPercent(item.benchmark)}</span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
