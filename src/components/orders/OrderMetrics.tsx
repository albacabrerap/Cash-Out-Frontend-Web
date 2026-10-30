import { formatTokens } from '@/lib/format'
import { ORDER_PERIODS, type OrderMetric, type OrderPeriod } from '@/lib/orders'
import { cn } from '@/lib/utils'
import { SegmentButton, Segmented } from '@/components/filters/Segmented'

const META: Record<OrderMetric['key'], { label: string; tone: string; bar: string }> = {
  executed: { label: 'Órdenes ejecutadas', tone: '', bar: 'bg-accent-ink' },
  invested: { label: 'Fichas invertidas', tone: '', bar: 'bg-accent-ink' },
  received: { label: 'Fichas recibidas', tone: 'text-gain', bar: 'bg-gain' },
  rejected: { label: 'Rechazadas', tone: 'text-warning', bar: 'bg-warning' },
}

function note(metric: OrderMetric): string {
  if (metric.key === 'executed') return `${metric.count} enviadas en el periodo`
  if (metric.key === 'invested') return `en ${metric.count} ${metric.count === 1 ? 'compra' : 'compras'}`
  if (metric.key === 'received') return `en ${metric.count} ${metric.count === 1 ? 'venta' : 'ventas'}`
  return metric.count ? 'el motivo está en cada una' : 'ninguna en el periodo'
}

interface OrderMetricsProps {
  metrics: OrderMetric[] | undefined
  period: OrderPeriod
  onPeriodChange: (period: OrderPeriod) => void
}

/** Las cuatro cifras del periodo, cada una con sus siete tramos. */
export function OrderMetrics({ metrics, period, onPeriodChange }: OrderMetricsProps) {
  return (
    <section aria-labelledby="ordenes-metricas" className="rounded-2xl border bg-card px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ordenes-metricas" className="text-xs tracking-wider text-muted-foreground uppercase">
          Tus órdenes
        </h2>
        <Segmented label="Periodo">
          {ORDER_PERIODS.map((option) => (
            <SegmentButton key={option.value} pressed={period === option.value} onClick={() => onPeriodChange(option.value)}>
              {option.label}
            </SegmentButton>
          ))}
        </Segmented>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-y-4 lg:grid-cols-4">
        {(metrics ?? Object.keys(META).map(() => undefined)).map((metric, i) => {
          const meta = metric ? META[metric.key] : undefined
          const max = metric ? Math.max(...metric.bars) : 0
          return (
            <div key={metric?.key ?? i} className={cn('min-w-0 px-4 sm:px-5', i % 2 === 1 ? 'border-l' : 'pl-0 sm:pl-0', i === 2 && 'lg:border-l lg:pl-5')}>
              <p className="text-[13px] text-muted-foreground">{meta?.label ?? ' '}</p>
              <p
                className={cn(
                  'mt-1 text-2xl font-semibold tracking-tight tabular-nums',
                  metric?.key === 'rejected' && metric.value === 0 ? '' : meta?.tone,
                )}
              >
                {metric ? (
                  metric.key === 'invested' || metric.key === 'received' ? formatTokens(metric.value).replace(/ fichas$/, '') : metric.value
                ) : (
                  <span className="inline-block h-7 w-20 animate-pulse rounded bg-muted align-middle" />
                )}
              </p>
              <div aria-hidden="true" className="mt-2 flex h-6 items-end gap-[3px]">
                {(metric?.bars ?? Array<number>(7).fill(0)).map((value, j) => (
                  <span
                    key={j}
                    className={cn('min-h-0.5 flex-1 rounded-[3px]', value > 0 && meta ? meta.bar : 'bg-border')}
                    style={{ height: max > 0 ? `${(value / max) * 100}%` : undefined }}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{metric ? note(metric) : ' '}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
