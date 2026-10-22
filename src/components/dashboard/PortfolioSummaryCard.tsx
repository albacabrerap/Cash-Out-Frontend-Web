import { Link } from 'react-router'
import { ChartCandlestick } from 'lucide-react'
import type { ApiQuery } from '@/hooks/useApiQuery'
import { portfolioAllocation } from '@/lib/dashboard'
import { formatSignedPercent, formatSignedTokens, formatUsd, returnPercent } from '@/lib/market'
import type { Portfolio, Position } from '@/types/market'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const tokens = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const SLICE_COLORS = ['bg-income', 'bg-accent-ink', 'bg-muted-foreground', 'bg-border']

const costOf = (positions: readonly Position[]) => positions.reduce((sum, p) => sum + p.quantity * p.averageCost, 0)

/** Cuanto vale lo invertido, como se reparte y como le va a cada posicion desde que se compro. */
export function PortfolioSummaryCard({ query }: { query: ApiQuery<Portfolio> }) {
  const data = query.data
  if (query.error && !data) {
    return (
      <section className="rounded-2xl border bg-card p-5 lg:col-span-2">
        <ErrorState error={query.error} onRetry={query.reload} title="No pudimos cargar tu portafolio" />
      </section>
    )
  }
  if (!data) return <Skeleton className="h-75 rounded-2xl lg:col-span-2" />

  if (data.positions.length === 0) {
    return (
      <section aria-labelledby="resumen-portafolio" className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border bg-card p-8 text-center lg:col-span-3">
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
          <ChartCandlestick className="size-5" />
        </span>
        <h2 id="resumen-portafolio" className="text-sm font-semibold">
          Todavía no inviertes tus fichas
        </h2>
        <p className="max-w-sm text-[13px] text-muted-foreground">
          Con 0.01 fichas ya puedes comprar una parte de una acción o de una cripto, con precios reales.
        </p>
        <Button asChild size="sm" className="mt-1">
          <Link to="/portafolio/mercado">Ir al mercado</Link>
        </Button>
      </section>
    )
  }

  const slices = portfolioAllocation(data.positions)
  const percent = returnPercent(data.unrealizedPnl, costOf(data.positions))
  const ticker = data.positions.map((p) => ({
    symbol: p.symbol,
    price: formatUsd(p.currentPrice),
    change: p.currentPrice === null ? null : returnPercent(p.currentPrice - p.averageCost, p.averageCost),
  }))
  // El ticker se repite para que el bucle no deje un hueco al volver a empezar.
  const loop = [...ticker, ...ticker, ...ticker, ...ticker]

  return (
    <section aria-labelledby="resumen-portafolio" className="flex min-h-75 flex-col overflow-hidden rounded-2xl border bg-card lg:col-span-2">
      <div className="grid flex-1 gap-8 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:px-6">
        <div>
          <h2 id="resumen-portafolio" className="text-sm font-medium text-muted-foreground">
            Tu portafolio
          </h2>
          <p className="mt-3.5 flex items-baseline gap-2">
            <span className="font-display text-6xl leading-none tabular-nums">{tokens.format(data.simulatedValue)}</span>
            <span className="text-sm text-muted-foreground">fichas</span>
          </p>
          <p className="mt-2.5 text-[13px]">
            <span className={cn('font-medium', data.unrealizedPnl >= 0 ? 'text-gain' : 'text-loss')}>
              {data.unrealizedPnl >= 0 ? '▲' : '▼'} {formatSignedTokens(data.unrealizedPnl)} ({formatSignedPercent(percent)})
            </span>{' '}
            <span className="text-muted-foreground">si vendieras todo hoy</span>
          </p>
        </div>
        <div>
          <p className="text-[13px] text-muted-foreground">Cómo se reparte</p>
          <div aria-hidden="true" className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {slices.map((slice, i) => (
              <span
                key={slice.label}
                className={cn('origin-left', SLICE_COLORS[i])}
                style={{ flex: slice.value, animation: `grow-x 1s cubic-bezier(.2,.7,.2,1) ${0.4 + i * 0.1}s both` }}
              />
            ))}
          </div>
          <ul className="mt-3.5 space-y-2">
            {slices.map((slice, i) => (
              <li key={slice.label} className="flex items-center gap-2.5 text-[13px]">
                <span aria-hidden="true" className={cn('size-2 flex-none rounded-sm', SLICE_COLORS[i])} />
                <strong className="font-mono font-medium">{slice.label}</strong>
                <span className="truncate text-muted-foreground">{slice.name}</span>
                <span className="ml-auto font-mono tabular-nums">{tokens.format(slice.value)}</span>
                <span className="w-11 text-right text-muted-foreground tabular-nums">{Math.round(slice.share * 100)} %</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div
        className="overflow-hidden border-t"
        style={{ maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' }}
      >
        <ul aria-label="Tus posiciones desde que las compraste" className="flex w-max animate-[marquee_26s_linear_infinite] hover:[animation-play-state:paused]">
          {loop.map((item, i) => (
            <li
              key={`${item.symbol}-${i}`}
              aria-hidden={i >= ticker.length}
              className="flex items-center gap-2 px-4 py-3 text-[12.5px] whitespace-nowrap"
            >
              <strong className="font-mono font-medium">{item.symbol}</strong>
              <span className="font-mono text-muted-foreground">{item.price}</span>
              <span className={cn(item.change === null ? 'text-muted-foreground' : item.change >= 0 ? 'text-gain' : 'text-loss')}>
                {item.change === null ? '—' : `${item.change >= 0 ? '▲' : '▼'} ${formatSignedPercent(item.change)}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
