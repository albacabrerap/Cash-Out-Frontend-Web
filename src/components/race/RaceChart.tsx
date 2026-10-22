import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts'
import { formatSignedPercent } from '@/lib/market'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'

interface RaceChartProps {
  prices: number[]
  totalSteps: number
  /** Sin ejes ni grilla: para el celular. */
  compact?: boolean
  className?: string
}

/** El precio de la moneda misteriosa, que crece de izquierda a derecha hasta el final de la carrera. */
export function RaceChart({ prices, totalSteps, compact = false, className }: RaceChartProps) {
  const gradientId = useId()
  const last = prices.at(-1) ?? 100
  const up = last >= 100
  const config = { price: { label: 'Precio', color: up ? 'var(--signal-up)' : 'var(--signal-down)' } } satisfies ChartConfig
  const data = prices.map((price, step) => ({ step, price }))
  const low = Math.min(100, ...prices)
  const high = Math.max(100, ...prices)
  const pad = Math.max((high - low) * 0.12, 1)
  // Con el precio casi quieto, sin decimales el eje repetiria "100, 100, 101".
  const decimals = high - low < 10 ? 1 : 0

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto w-full', className)}
      role="img"
      aria-label={`Precio de la moneda misteriosa: ${last.toFixed(2)}, ${formatSignedPercent(last - 100)} desde el inicio.`}
    >
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {!compact && <CartesianGrid vertical={false} />}
        <XAxis dataKey="step" type="number" domain={[0, Math.max(totalSteps - 1, 1)]} hide />
        <YAxis
          domain={[low - pad, high + pad]}
          hide={compact}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(value: number) => value.toFixed(decimals)}
        />
        <ReferenceLine y={100} stroke="var(--muted-foreground)" strokeDasharray="4 6" strokeOpacity={0.7} />
        <Area
          dataKey="price"
          type="linear"
          stroke="var(--color-price)"
          strokeWidth={compact ? 2 : 2.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
