import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatTokens } from '@/lib/format'
import { formatSignedPercent, formatSignedTokens } from '@/lib/market'
import { formatDayMonth } from '@/lib/movements'
import type { PortfolioDay, PortfolioNow } from '@/lib/portfolioHistory'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

type MetricKey = keyof PortfolioNow

const METRICS: { key: MetricKey; label: string; signed: boolean }[] = [
  { key: 'tokens', label: 'Fichas disponibles', signed: false },
  { key: 'value', label: 'Valor de tus inversiones', signed: false },
  { key: 'unrealized', label: 'Ganancia sin vender', signed: true },
  { key: 'realized', label: 'Ganancia de tus ventas', signed: true },
]

interface MetricStripProps {
  /** Lo que dice el backend ahora; undefined mientras carga. */
  now: PortfolioNow | undefined
  /** Los ultimos dias, para las lineas; undefined mientras se arman. */
  history: PortfolioDay[] | undefined
  /** No se pudo armar el mes: las cifras se muestran sin linea. */
  failed?: boolean
}

/** Las cuatro cifras del portafolio con su linea de 30 dias; pasar por una mueve las cuatro al mismo dia. */
export function MetricStrip({ now, history, failed = false }: MetricStripProps) {
  const [day, setDay] = useState<number | null>(null)
  const last = history ? history.length - 1 : 0
  const index = day ?? last
  const point = history?.[index]
  const label = !history || day === null ? 'Hoy' : `Al ${formatDayMonth(history[index].date)}`

  const move = (next: number) => setDay(Math.min(last, Math.max(0, next)))
  const track = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    move(Math.round(((event.clientX - box.left) / box.width) * last))
  }
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    move(index + (event.key === 'ArrowRight' ? 1 : -1))
  }

  return (
    <section aria-labelledby="portafolio-metricas" className="rounded-2xl border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
        <h2 id="portafolio-metricas" className="text-xs tracking-wider text-muted-foreground uppercase">
          Últimos 30 días
        </h2>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {label}
          {history && ' · pasa el mouse o usa las flechas sobre una línea'}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map(({ key, label: title, signed }, i) => {
          const value = point?.[key] ?? now?.[key]
          const first = history?.[0][key]
          const tone = signed && value !== undefined ? (value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : '') : ''
          let sub = ''
          if (key === 'unrealized' && point) {
            const invested = point.value - point.unrealized
            sub = invested > 0 ? `${formatSignedPercent((point.unrealized / invested) * 100)} sobre lo invertido` : 'sin posiciones'
          } else if (value !== undefined && first !== undefined) {
            const delta = value - first
            sub = Math.abs(delta) < 0.005 ? 'sin cambios en 30 días' : `${formatSignedTokens(delta)} en 30 días`
          }
          return (
            <div key={key} className={cn('px-5 pt-2.5 pb-4', i > 0 && 'border-t sm:border-t-0 lg:border-l', i === 2 && 'sm:border-t lg:border-t-0', i === 3 && 'sm:border-t sm:border-l lg:border-t-0')}>
              <p className="text-[13px] text-muted-foreground">{title}</p>
              <p className={cn('mt-1 text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums', tone)}>
                {value === undefined ? (
                  <span className="inline-block h-8 w-32 animate-pulse rounded-md bg-muted align-middle" />
                ) : signed ? (
                  formatSignedTokens(value)
                ) : (
                  formatTokens(value)
                )}
              </p>
              <p className="mt-0.5 min-h-4 text-xs text-muted-foreground">{sub}</p>
              {history ? (
                <Sparkline
                  values={history.map((d) => d[key])}
                  index={index}
                  active={day !== null}
                  color={signed ? (value !== undefined && value < 0 ? 'var(--loss)' : 'var(--gain)') : 'var(--accent-ink)'}
                  label={`${title} en los últimos 30 días`}
                  onPointerMove={track}
                  onLeave={() => setDay(null)}
                  onKeyDown={keys}
                />
              ) : failed ? null : (
                <Skeleton className="mt-2 h-11 w-full" />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

interface SparklineProps {
  values: number[]
  index: number
  active: boolean
  color: string
  label: string
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onLeave: () => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

function Sparkline({ values, index, active, color, label, onPointerMove, onLeave, onKeyDown }: SparklineProps) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  // Un piso de escala: medio centimo de diferencia no debe verse como un salto.
  const span = Math.max(max - min, Math.abs(max) * 0.02, 1)
  const x = (i: number) => (values.length > 1 ? (i / (values.length - 1)) * 100 : 0)
  const y = (value: number) => 4 + (1 - (value - min) / span) * 36
  const path = values.map((value, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)} ${y(value).toFixed(2)}`).join(' ')

  return (
    <div
      role="img"
      tabIndex={0}
      aria-label={label}
      onPointerMove={onPointerMove}
      onPointerLeave={onLeave}
      onBlur={onLeave}
      onKeyDown={onKeyDown}
      className="relative mt-2 h-11 touch-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <svg viewBox="0 0 100 44" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <path d={path} fill="none" stroke={color} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
      </svg>
      {active && <span aria-hidden="true" className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${x(index)}%` }} />}
      <span
        aria-hidden="true"
        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card"
        style={{ left: `${x(index)}%`, top: `${(y(values[index]) / 44) * 100}%`, background: color }}
      />
    </div>
  )
}
