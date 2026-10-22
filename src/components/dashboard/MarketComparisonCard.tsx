import { useApiQuery } from '@/hooks/useApiQuery'
import { changeSince } from '@/lib/dashboard'
import { formatDate, parseServerDateTime } from '@/lib/format'
import { formatSignedPercent, returnPercent } from '@/lib/market'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import type { Portfolio } from '@/types/market'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const INDEX_SYMBOL = 'SPY'

/** yyyy-MM-dd local de un LocalDateTime del servidor. */
function localDay(serverDateTime: string): string {
  const date = parseServerDateTime(serverDateTime)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

/** El S&P 500 desde la primera compra: cuanto habria rendido comprar todo el mercado ese dia. */
async function indexSinceFirstOrder(signal: AbortSignal) {
  const [orders, assets] = await Promise.all([
    portfolioService.listOrders({ page: 0, size: 1, sort: 'createdAt,asc' }, signal),
    marketService.searchAssets({ page: 0, size: 5, search: INDEX_SYMBOL }, signal),
  ])
  const first = orders.content[0]
  const index = assets.content.find((a) => a.symbol === INDEX_SYMBOL)
  if (!first || !index) return null
  const since = localDay(first.createdAt)
  const history = await marketService.getPriceHistory(index.id, signal)
  return { since, change: changeSince(history, since) }
}

/** ¿Le ganas al mercado? Tu rendimiento contra el del indice en el mismo periodo. */
export function MarketComparisonCard({ portfolio }: { portfolio: Portfolio }) {
  const index = useApiQuery(['market-comparison'], indexSinceFirstOrder)
  const cost = portfolio.positions.reduce((sum, p) => sum + p.quantity * p.averageCost, 0)
  const mine = returnPercent(portfolio.unrealizedPnl, cost) ?? 0
  const market = index.data?.change ?? null

  const rows = [
    { name: 'Tu portafolio', value: mine, bar: 'bg-accent-ink', strong: true },
    ...(market === null ? [] : [{ name: 'S&P 500 (SPY)', value: market, bar: 'bg-muted-foreground', strong: false }]),
    { name: 'Sin invertir', value: 0, bar: 'bg-muted-foreground', strong: false },
  ]
  const widest = Math.max(...rows.map((r) => Math.abs(r.value)), 0.01)

  return (
    <section aria-labelledby="resumen-mercado" className="flex min-h-75 flex-col rounded-2xl border bg-card p-5">
      <p className="text-xs tracking-wider text-muted-foreground uppercase">↗ Comparación</p>
      <h2 id="resumen-mercado" className="mt-2.5 font-display text-[1.75rem] leading-tight">
        ¿Le ganas al <em className="text-accent-ink">mercado</em>?
      </h2>
      {index.isLoading ? (
        <Skeleton className="mt-5 h-28 w-full" />
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.name}>
              <span className="flex items-baseline justify-between text-[13px]">
                <span className={row.strong ? 'font-semibold' : undefined}>{row.name}</span>
                <span
                  className={cn(
                    'font-mono text-[15px] font-medium tabular-nums',
                    row.value > 0 ? 'text-gain' : row.value < 0 ? 'text-loss' : 'text-muted-foreground',
                  )}
                >
                  {formatSignedPercent(row.value)}
                </span>
              </span>
              <span className="mt-1.5 block h-1.5 rounded-full bg-border">
                <span
                  className={cn('block h-full origin-left rounded-full', row.bar, !row.strong && 'opacity-60')}
                  style={{ width: `${Math.max((Math.abs(row.value) / widest) * 100, 1.5)}%`, animation: 'grow-x 1s cubic-bezier(.2,.7,.2,1) .4s both' }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-auto pt-4 text-xs leading-relaxed text-muted-foreground">
        {index.data
          ? market === null
            ? `Todavía no hay cierres del índice desde tu primera compra (${formatDate(index.data.since)}). Vuelve en unos días.`
            : `Desde tu primera compra, el ${formatDate(index.data.since)}. Si el índice rinde más, comprar todo el mercado te habría servido más que elegir acciones.`
          : index.error
            ? 'No pudimos traer el índice para comparar.'
            : ' '}
      </p>
    </section>
  )
}
