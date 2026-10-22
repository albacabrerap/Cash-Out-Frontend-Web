import { useId, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { LiveStatus } from '@/hooks/useLivePrices'
import { formatAxisUsd, formatSignedPercent, formatUsd } from '@/lib/market'
import type { LivePoint } from '@/types/market'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

const WINDOWS = [
  { key: '1 min', seconds: 60, description: 'en el último minuto' },
  { key: '5 min', seconds: 300, description: 'en los últimos 5 minutos' },
  { key: '15 min', seconds: 900, description: 'en los últimos 15 minutos' },
] as const

type WindowKey = (typeof WINDOWS)[number]['key']

const clock = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const cents = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const STATUS_LABEL: Record<LiveStatus, string> = {
  connecting: 'Conectando…',
  live: 'En vivo',
  reconnecting: 'Reconectando…',
}

interface LivePriceChartProps {
  symbol: string
  points: LivePoint[]
  status: LiveStatus
}

export function LivePriceChart({ symbol, points, status }: LivePriceChartProps) {
  const gradientId = useId()
  const [windowKey, setWindowKey] = useState<WindowKey>('5 min')
  const selected = WINDOWS.find((w) => w.key === windowKey) ?? WINDOWS[1]

  const last = points.at(-1)
  const visible = last ? points.filter((point) => point.time > last.time - selected.seconds) : []
  const first = visible[0]
  const change = first && last ? ((last.price - first.price) / first.price) * 100 : null
  const up = (change ?? 0) >= 0
  const config = { price: { label: 'Precio', color: up ? 'var(--signal-up)' : 'var(--signal-down)' } } satisfies ChartConfig

  const prices = visible.map((point) => point.price)
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  // Con el precio quieto el eje se aplasta en una linea: un margen minimo la deja en el medio.
  const pad = Math.max((high - low) * 0.15, (last?.price ?? 0) * 0.0002)
  // Si el rango es de centavos, el eje necesita decimales aunque el precio pase de 100.
  const axisLabel = (value: number) =>
    high - low < 20 && Math.abs(value) >= 100 ? `$${cents.format(value)}` : formatAxisUsd(value)

  const summary =
    first && last
      ? `Precio en vivo de ${symbol}: de ${formatUsd(first.price)} a ${formatUsd(last.price)} ${selected.description} (${formatSignedPercent(change)}).`
      : `Esperando el precio en vivo de ${symbol}.`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            <span
              aria-hidden="true"
              className={cn(
                'size-2 rounded-full',
                status === 'live' ? 'animate-pulse bg-signal-up' : 'bg-muted-foreground',
              )}
            />
            {STATUS_LABEL[status]}
          </span>
          {change !== null && (
            <>
              <span className={cn('font-medium tabular-nums', up ? 'text-gain' : 'text-loss')}>
                {formatSignedPercent(change)}
              </span>
              <span className="text-muted-foreground">{selected.description}</span>
            </>
          )}
        </p>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={windowKey}
          onValueChange={(value) => value && setWindowKey(value as WindowKey)}
          aria-label="Ventana del gráfico en vivo"
        >
          {WINDOWS.map((w) => (
            <ToggleGroupItem key={w.key} value={w.key} aria-label={w.description} className="px-2.5">
              {w.key}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {visible.length === 0 ? (
        <Skeleton className="h-64 w-full sm:h-72" />
      ) : (
        <figure>
          <ChartContainer config={config} className="aspect-auto h-64 w-full sm:h-72" role="img" aria-label={summary}>
            <AreaChart data={visible} margin={{ left: 4, right: 4, top: 8 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickLine={false}
                axisLine={false}
                minTickGap={48}
                tickFormatter={(value: number) => clock.format(value * 1000)}
              />
              <YAxis
                domain={[low - pad, high + pad]}
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={axisLabel}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const time = payload?.[0]?.payload?.time
                      return typeof time === 'number' ? clock.format(time * 1000) : ''
                    }}
                    formatter={(value) => formatUsd(Number(value))}
                  />
                }
              />
              <Area
                dataKey="price"
                type="linear"
                stroke="var(--color-price)"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
          <figcaption className="sr-only">{summary}</figcaption>
        </figure>
      )}
    </div>
  )
}
