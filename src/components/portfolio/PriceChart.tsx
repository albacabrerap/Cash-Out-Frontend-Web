import { useId, useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { chartRangeStart, CHART_RANGES, type ChartRange } from '@/lib/chartRanges'
import { formatAxisUsd, formatSignedPercent, formatUsd } from '@/lib/market'
import { parseIsoDate } from '@/lib/dates'
import type { PricePoint } from '@/types/market'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

const monthYear = new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit' })
const dayMonth = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' })
const fullDate = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' })

interface PriceChartProps {
  symbol: string
  points: PricePoint[]
  range: ChartRange
  onRangeChange: (range: ChartRange) => void
}

export function PriceChart({ symbol, points, range, onRangeChange }: PriceChartProps) {
  const gradientId = useId()
  const visible = useMemo(() => {
    const last = points.at(-1)
    if (!last) return []
    const start = chartRangeStart(last.date, range)
    return points.filter((point) => point.date >= start)
  }, [points, range])

  const first = visible[0]
  const last = visible.at(-1)
  const change = first && last ? ((last.closePrice - first.closePrice) / first.closePrice) * 100 : null
  const up = (change ?? 0) >= 0
  const config = { closePrice: { label: 'Cierre', color: up ? 'var(--signal-up)' : 'var(--signal-down)' } } satisfies ChartConfig
  // Hasta 6 meses se muestra el dia: con solo el mes, varias marcas repetirian "may. 26".
  const shortRange = range === '1M' || range === '3M' || range === '6M'

  const summary =
    first && last
      ? `Precio de ${symbol} entre el ${fullDate.format(parseIsoDate(first.date))} y el ${fullDate.format(parseIsoDate(last.date))}: de ${formatUsd(first.closePrice)} a ${formatUsd(last.closePrice)} (${formatSignedPercent(change)}).`
      : `Sin cierres de ${symbol} en este rango.`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <span className={cn('font-medium tabular-nums', up ? 'text-gain' : 'text-loss')}>
            {formatSignedPercent(change)}
          </span>{' '}
          <span className="text-muted-foreground">{CHART_RANGES.find((r) => r.key === range)?.description}</span>
        </p>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={range}
          onValueChange={(value) => value && onRangeChange(value as ChartRange)}
          aria-label="Rango del gráfico"
        >
          {CHART_RANGES.map((r) => (
            <ToggleGroupItem key={r.key} value={r.key} aria-label={r.description} className="px-2.5">
              {r.key}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <figure>
        <ChartContainer config={config} className="aspect-auto h-64 w-full sm:h-72" role="img" aria-label={summary}>
          <AreaChart data={visible} margin={{ left: 4, right: 4, top: 8 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-closePrice)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-closePrice)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              minTickGap={40}
              tickFormatter={(value: string) => (shortRange ? dayMonth : monthYear).format(parseIsoDate(value))}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(value: number) => formatAxisUsd(value)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => fullDate.format(parseIsoDate(String(value)))}
                  formatter={(value) => formatUsd(Number(value))}
                />
              }
            />
            <Area
              dataKey="closePrice"
              type="monotone"
              stroke="var(--color-closePrice)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
        <figcaption className="sr-only">{summary}</figcaption>
      </figure>
    </div>
  )
}
