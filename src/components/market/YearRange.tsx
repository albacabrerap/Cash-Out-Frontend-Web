import type { YearStats } from '@/lib/assetStats'
import { formatSignedPercent, formatUsd } from '@/lib/market'
import { Skeleton } from '@/components/ui/skeleton'

interface YearRangeProps {
  /** undefined mientras carga; null si no hay un ano de cierres. */
  stats: YearStats | null | undefined
  price: number | undefined
}

/** Donde esta el precio de hoy entre el minimo y el maximo del ultimo ano, con tres cifras de riesgo. */
export function YearRange({ stats, price }: YearRangeProps) {
  const position = stats && price !== undefined ? ((price - stats.low) / (stats.high - stats.low || 1)) * 100 : null
  // Cerca de un extremo la etiqueta se apoya hacia adentro para no salirse de la tarjeta.
  const shift = position === null ? '-50%' : position > 80 ? '-100%' : position < 20 ? '0%' : '-50%'

  return (
    <section aria-labelledby="activo-52s" className="rounded-2xl border bg-card px-5 py-4">
      <h2 id="activo-52s" className="text-xs tracking-wider text-muted-foreground uppercase">
        Últimas 52 semanas
      </h2>
      {stats === undefined ? (
        <Skeleton className="mt-4 h-28 w-full" />
      ) : stats === null ? (
        <p className="mt-3 text-sm text-muted-foreground">Todavía no hay un año de cierres para calcularlo.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Hoy ${formatUsd(price)}, entre ${formatUsd(stats.low)} y ${formatUsd(stats.high)}`}
            className="relative mt-7 mb-2 h-2 rounded-full bg-gradient-to-r from-loss via-warning to-gain"
          >
            {position !== null && (
              <>
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-4 ring-card"
                  style={{ left: `${position}%` }}
                />
                <span
                  aria-hidden="true"
                  className="absolute -top-5.5 font-mono text-[11px] whitespace-nowrap"
                  style={{ left: `${position}%`, transform: `translateX(${shift})` }}
                >
                  {formatUsd(price)}
                </span>
              </>
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Mín. {formatUsd(stats.low)}</span>
            <span>Máx. {formatUsd(stats.high)}</span>
          </div>
          <dl className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-1.5 text-[13px]">
            <dt className="text-muted-foreground">Volatilidad anual</dt>
            <dd className="text-right font-mono tabular-nums">{stats.volatility === null ? '—' : `${stats.volatility.toFixed(1)} %`}</dd>
            <dt className="text-muted-foreground">Peor caída del año</dt>
            <dd className="text-right font-mono tabular-nums">{formatSignedPercent(stats.maxDrawdown)}</dd>
            <dt className="text-muted-foreground">Distancia al máximo</dt>
            <dd className="text-right font-mono tabular-nums">{formatSignedPercent(stats.fromHigh)}</dd>
          </dl>
          <p className="mt-2.5 text-[11.5px] text-muted-foreground">Calculado con los cierres diarios del último año.</p>
        </>
      )}
    </section>
  )
}
