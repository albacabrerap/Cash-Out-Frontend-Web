import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { formatTokens } from '@/lib/format'
import { formatQuantity, formatSignedPercent, formatUsd, returnPercent } from '@/lib/market'
import { cn } from '@/lib/utils'
import { marketService } from '@/services/marketService'
import type { OrderSide, Position, PricePoint } from '@/types/market'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PnlText } from './PnlText'

interface PositionsListProps {
  positions: Position[] | undefined
  /** Cierres recientes por activo, para la linea de cada fila. */
  closes: Map<number, PricePoint[]> | undefined
  colorOf: (assetId: number) => string
  onTrade: (position: Position, side: OrderSide) => void
}

const COLUMNS = 'grid-cols-[minmax(0,1fr)_auto_1.5rem] sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_7.5rem_8rem_1.5rem]'

/** Lo que tienes, una fila por activo; al abrirla, su ultimo mes contra tu precio promedio. */
export function PositionsList({ positions, closes, colorOf, onTrade }: PositionsListProps) {
  const [open, setOpen] = useState<number | null | undefined>(undefined)
  const expanded = open === undefined ? positions?.[0]?.assetId : open

  return (
    <div className="text-[13px]">
      <div className={cn('hidden gap-3 border-b px-5 py-2.5 text-xs text-muted-foreground sm:grid', COLUMNS)} aria-hidden="true">
        <span>Activo</span>
        <span className="text-right">Costo prom.</span>
        <span className="text-right">Precio hoy</span>
        <span className="text-right">Valor</span>
        <span className="text-right">Resultado</span>
        <span />
      </div>
      <ul aria-label="Tus inversiones">
        {!positions
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 border-b px-5 py-3.5">
                <Skeleton className="size-8 rounded-[10px]" />
                <Skeleton className="h-4 max-w-40 flex-1" />
                <Skeleton className="h-4 w-20" />
              </li>
            ))
          : positions.map((position) => {
              const isOpen = expanded === position.assetId
              const panelId = `posicion-${position.assetId}`
              return (
                <li key={position.id} className={cn('border-b last:border-b-0', isOpen && 'bg-muted/40')}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : position.assetId)}
                    className={cn(
                      'grid w-full items-center gap-3 px-5 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      COLUMNS,
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="grid size-8 shrink-0 place-items-center rounded-[10px] text-xs font-bold text-background"
                        style={{ background: colorOf(position.assetId) }}
                      >
                        {position.symbol[0]}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate font-semibold">{position.symbol}</strong>
                        <span className="block truncate text-xs text-muted-foreground">
                          {formatQuantity(position.quantity)} · {position.assetName}
                        </span>
                      </span>
                    </span>
                    <span className="hidden text-right font-mono text-muted-foreground tabular-nums sm:block">
                      {formatUsd(position.averageCost)}
                    </span>
                    <span className="hidden text-right font-mono tabular-nums sm:block">{formatUsd(position.currentPrice)}</span>
                    <span className="hidden text-right font-medium tabular-nums sm:block">
                      {position.marketValue === null ? '—' : formatTokens(position.marketValue)}
                    </span>
                    <span className="text-right">
                      <span className="block font-medium tabular-nums sm:hidden">
                        {position.marketValue === null ? '—' : formatTokens(position.marketValue)}
                      </span>
                      <PnlText
                        stacked
                        className="text-xs sm:text-[13px]"
                        value={position.unrealizedPnl}
                        percent={returnPercent(position.unrealizedPnl, position.quantity * position.averageCost)}
                      />
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn('size-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                    />
                  </button>
                  {isOpen && (
                    <PositionDetail id={panelId} position={position} closes={closes?.get(position.assetId)} onTrade={onTrade} />
                  )}
                </li>
              )
            })}
      </ul>
    </div>
  )
}

function PositionDetail({
  id,
  position,
  closes,
  onTrade,
}: {
  id: string
  position: Position
  closes: PricePoint[] | undefined
  onTrade: (position: Position, side: OrderSide) => void
}) {
  const quote = useApiQuery(['quote', position.assetId], (signal) => marketService.getQuote(position.assetId, signal))
  const points = closes ?? []
  const prices = points.map((point) => point.closePrice)
  const max = prices.length ? Math.max(...prices) : null
  const min = prices.length ? Math.min(...prices) : null
  const change = quote.data?.changePercent ?? null

  return (
    <div id={id} className="grid gap-4 px-5 pt-1 pb-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
      {points.length > 1 ? (
        <PriceLine points={points} averageCost={position.averageCost} symbol={position.symbol} />
      ) : closes ? (
        <p className="self-center text-xs text-muted-foreground">Todavía no hay cierres de este mes para dibujar.</p>
      ) : (
        <Skeleton className="h-28 w-full" />
      )}
      <div className="flex flex-col gap-1.5 text-[12.5px]">
        <p className="flex justify-between">
          <span className="text-muted-foreground">Máx. del mes</span>
          <span className="font-mono tabular-nums">{formatUsd(max)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-muted-foreground">Mín. del mes</span>
          <span className="font-mono tabular-nums">{formatUsd(min)}</span>
        </p>
        <p className={cn(change !== null && (change >= 0 ? 'text-gain' : 'text-loss'))}>
          {change === null ? <span className="text-muted-foreground">Variación del día: —</span> : `${formatSignedPercent(change)} hoy`}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onTrade(position, 'BUY')}>
            Comprar
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onTrade(position, 'SELL')}>
            Vender
          </Button>
        </div>
        <Link to={`/portafolio/mercado/${position.assetId}`} className="text-xs font-medium underline-offset-4 hover:underline">
          Ver gráfico completo
        </Link>
      </div>
    </div>
  )
}

/** Los cierres del mes y una linea punteada en tu precio promedio: arriba de ella vas ganando. */
function PriceLine({ points, averageCost, symbol }: { points: PricePoint[]; averageCost: number; symbol: string }) {
  const values = points.map((point) => point.closePrice)
  const min = Math.min(...values, averageCost)
  const max = Math.max(...values, averageCost)
  const span = max - min || 1
  const x = (i: number) => (i / (points.length - 1)) * 100
  const y = (value: number) => 6 + (1 - (value - min) / span) * 88
  const path = values.map((value, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)} ${y(value).toFixed(2)}`).join(' ')
  const lastValue = values[values.length - 1]

  return (
    <div
      role="img"
      aria-label={`${symbol}: cierres del último mes, de ${formatUsd(values[0])} a ${formatUsd(lastValue)}; tu precio promedio es ${formatUsd(averageCost)}.`}
      className="relative h-28"
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <path
          d={`${path} L100 100 L0 100 Z`}
          fill={lastValue >= averageCost ? 'var(--gain)' : 'var(--loss)'}
          fillOpacity={0.08}
        />
        <path
          d={path}
          fill="none"
          stroke={lastValue >= averageCost ? 'var(--gain)' : 'var(--loss)'}
          strokeWidth={1.8}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={0}
          x2={100}
          y1={y(averageCost)}
          y2={y(averageCost)}
          stroke="var(--foreground)"
          strokeOpacity={0.5}
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute right-0 -translate-y-full pb-0.5 text-[11px] text-muted-foreground [text-shadow:0_0_4px_var(--card)]"
        style={{ top: `${y(averageCost)}%` }}
      >
        tu precio promedio
      </span>
    </div>
  )
}
