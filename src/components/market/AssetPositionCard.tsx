import { formatQuantity, formatSignedPercent, formatSignedTokens, formatUsd, returnPercent } from '@/lib/market'
import { cn } from '@/lib/utils'
import type { Position } from '@/types/market'

interface AssetPositionCardProps {
  symbol: string
  position: Position | undefined
  /** Lo invertido en todo el portafolio, para mostrar cuanto pesa este activo. */
  invested: number | undefined
  /** "acciones" o la unidad de la cripto. */
  unit: string
}

export function AssetPositionCard({ symbol, position, invested, unit }: AssetPositionCardProps) {
  const pnl = position?.unrealizedPnl ?? null
  const percent = position ? returnPercent(pnl, position.quantity * position.averageCost) : null
  const weight = position?.marketValue && invested ? (position.marketValue / invested) * 100 : null

  return (
    <section aria-labelledby="activo-posicion" className="rounded-2xl border bg-card px-5 py-4">
      <h2 id="activo-posicion" className="text-xs tracking-wider text-muted-foreground uppercase">
        Tu posición
      </h2>
      {position ? (
        <>
          <p className="mt-2.5 text-[26px] font-semibold tracking-tight tabular-nums">
            {position.marketValue === null ? '—' : position.marketValue.toFixed(2)}{' '}
            <span className="text-[13px] font-normal text-muted-foreground">fichas</span>
          </p>
          {pnl !== null && (
            <p className={cn('text-[13px] tabular-nums', pnl >= 0 ? 'text-gain' : 'text-loss')}>
              {formatSignedPercent(percent)} ({formatSignedTokens(pnl)}) desde que compraste
            </p>
          )}
          <dl className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-1.5 text-[13px]">
            <dt className="text-muted-foreground">Tienes</dt>
            <dd className="text-right font-mono tabular-nums">
              {formatQuantity(position.quantity)} {unit}
            </dd>
            <dt className="text-muted-foreground">Costo promedio</dt>
            <dd className="text-right font-mono tabular-nums">{formatUsd(position.averageCost)}</dd>
            <dt className="text-muted-foreground">Precio hoy</dt>
            <dd className="text-right font-mono tabular-nums">{formatUsd(position.currentPrice)}</dd>
          </dl>
          {weight !== null && (
            <>
              <p className="mt-3.5 mb-1.5 text-xs text-muted-foreground">Es el {Math.round(weight)} % de lo que tienes invertido</p>
              <div aria-hidden="true" className="h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent-ink" style={{ width: `${Math.min(100, weight)}%` }} />
              </div>
            </>
          )}
        </>
      ) : (
        <p className="mt-2.5 text-sm text-muted-foreground">
          Todavía no tienes {symbol}. Puedes comprar desde 0.01 fichas: no necesitas{' '}
          {unit === 'acciones' ? 'una acción entera' : 'una moneda entera'}.
        </p>
      )}
    </section>
  )
}
