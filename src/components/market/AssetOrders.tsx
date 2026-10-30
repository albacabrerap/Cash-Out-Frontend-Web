import { Link } from 'react-router'
import type { ApiError } from '@/api/errors'
import { formatDateTime } from '@/lib/format'
import { formatQuantity, formatSignedTokens, formatUsd } from '@/lib/market'
import { signedTokens } from '@/lib/orders'
import { cn } from '@/lib/utils'
import type { TradeOrder } from '@/types/market'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'

const SHOWN = 5

interface AssetOrdersProps {
  symbol: string
  /** Las ordenes de este activo, de la mas reciente a la mas antigua. */
  orders: TradeOrder[] | undefined
  error: ApiError | undefined
  onRetry(): void
}

/** Las compras y ventas del usuario en este activo, como linea de tiempo. */
export function AssetOrders({ symbol, orders, error, onRetry }: AssetOrdersProps) {
  return (
    <section aria-labelledby="activo-ordenes" className="rounded-2xl border bg-card px-5 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="activo-ordenes" className="text-xs tracking-wider text-muted-foreground uppercase">
          Tus órdenes de {symbol}
        </h2>
        <Link
          to={`/portafolio/ordenes?periodo=todo&q=${encodeURIComponent(symbol)}`}
          className="text-xs font-medium text-accent-ink underline-offset-4 hover:underline"
        >
          Ver todas
        </Link>
      </div>
      {error && !orders ? (
        <ErrorState error={error} onRetry={onRetry} title="No pudimos cargar tus órdenes" className="mt-3" />
      ) : !orders ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Todavía no compraste ni vendiste {symbol}.</p>
      ) : (
        <ol className="mt-2.5" aria-label={`Órdenes de ${symbol}`}>
          {orders.slice(0, SHOWN).map((order) => {
            const tokens = signedTokens(order)
            const rejected = order.status === 'REJECTED'
            return (
              <li key={order.id} className="grid grid-cols-[0.875rem_minmax(0,1fr)_auto] gap-2.5 border-t py-2.5 text-[13px]">
                <span
                  aria-hidden="true"
                  className={cn('mt-1.5 size-2.5 rounded-full', rejected ? 'bg-warning' : order.side === 'BUY' ? 'bg-accent-ink' : 'bg-income')}
                />
                <span className="min-w-0">
                  <strong className="font-semibold">
                    {rejected && 'Rechazada · '}
                    {order.side === 'BUY' ? 'Compra' : 'Venta'} de {formatQuantity(order.quantity)}
                  </strong>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatDateTime(order.createdAt)}
                    {order.executionPrice !== null && ` · a ${formatUsd(order.executionPrice)}`}
                    {rejected && order.rejectionReason && ` · ${order.rejectionReason}`}
                  </span>
                </span>
                <span className={cn('text-right font-mono tabular-nums', tokens === null ? 'text-muted-foreground' : tokens > 0 && 'text-gain')}>
                  {tokens === null ? '—' : formatSignedTokens(tokens).replace(/ fichas$/, '')}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
