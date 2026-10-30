import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { changeOf, inRange } from '@/lib/assetStats'
import { CHART_RANGES, type ChartRange } from '@/lib/chartRanges'
import { parseIsoDate } from '@/lib/dates'
import { formatSignedPercent, formatUsd } from '@/lib/market'
import { cn } from '@/lib/utils'
import type { PricePoint } from '@/types/market'
import { SegmentButton, Segmented } from '@/components/filters/Segmented'

const MAX_POINTS = 260
const fullDate = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
const dayMonth = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' })
const monthYear = new Intl.DateTimeFormat('es-PE', { month: 'short', year: 'numeric' })

interface AssetChartProps {
  symbol: string
  points: PricePoint[]
  range: ChartRange
  onRangeChange(range: ChartRange): void
  /** Cierres del S&P 500 (SPY) para comparar; sin ellos no se ofrece. */
  benchmark?: PricePoint[]
  compare: boolean
  onCompareChange(compare: boolean): void
  /** Costo promedio del usuario: se dibuja como referencia si cae dentro del grafico. */
  costBasis?: number | null
  /** Para la cripto: "En vivo" como una opcion mas del selector. */
  live?: { active: boolean; onSelect(): void; content: ReactNode }
}

function thin(points: PricePoint[]): PricePoint[] {
  if (points.length <= MAX_POINTS) return points
  const step = Math.ceil(points.length / MAX_POINTS)
  const out = points.filter((_, i) => i % step === 0)
  return out.at(-1) === points.at(-1) ? out : [...out, points.at(-1)!]
}

/** El precio del activo en el rango elegido, con cursor, comparacion contra el S&P 500 y tu costo. */
export function AssetChart({ symbol, points, range, onRangeChange, benchmark, compare, onCompareChange, costBasis, live }: AssetChartProps) {
  const gradientId = useId()
  const [hover, setHover] = useState<number | null>(null)
  const liveActive = live?.active ?? false

  const chart = useMemo(() => {
    const visible = thin(inRange(points, range))
    const bench = benchmark ? thin(inRange(benchmark, range)) : []
    const comparing = compare && bench.length > 1
    if (visible.length < 2) return null
    const time = (date: string) => parseIsoDate(date).getTime()
    const t0 = time(visible[0].date)
    const t1 = time(visible.at(-1)!.date)
    const x = (date: string) => ((time(date) - t0) / Math.max(1, t1 - t0)) * 1000
    const base = visible[0].closePrice
    const benchBase = bench[0]?.closePrice ?? 1
    const value = (point: PricePoint) => (comparing ? (point.closePrice / base - 1) * 100 : point.closePrice)
    const benchValue = (point: PricePoint) => (point.closePrice / benchBase - 1) * 100

    const values = visible.map(value)
    const all = comparing ? [...values, ...bench.map(benchValue)] : [...values]
    const showCost = !comparing && costBasis != null && costBasis > Math.min(...values) * 0.8 && costBasis < Math.max(...values) * 1.2
    if (showCost) all.push(costBasis)
    let lo = Math.min(...all)
    let hi = Math.max(...all)
    const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.02 || 1
    lo -= pad
    hi += pad
    const y = (v: number) => 300 - ((v - lo) / (hi - lo)) * 300
    const path = (list: PricePoint[], get: (p: PricePoint) => number) =>
      list.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(get(p)).toFixed(1)}`).join(' ')

    return {
      visible,
      values,
      x,
      y,
      comparing,
      line: path(visible, value),
      benchLine: comparing ? path(bench, benchValue) : null,
      costY: showCost ? y(costBasis) : null,
      ticks: [0, 1, 2, 3].map((k) => hi - ((hi - lo) * (k + 0.5)) / 4),
      change: changeOf(visible),
      benchChange: comparing ? changeOf(bench) : null,
    }
  }, [points, range, benchmark, compare, costBasis])

  const up = (chart?.change ?? 0) >= 0
  const color = up ? 'var(--signal-up)' : 'var(--signal-down)'
  const longRange = range === '1A' || range === '5A'
  const index = hover === null || !chart ? null : Math.min(chart.visible.length - 1, Math.max(0, hover))
  const point = index === null || !chart ? null : chart.visible[index]

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!chart) return
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) * 1000
    let best = 0
    chart.visible.forEach((p, i) => {
      if (Math.abs(chart.x(p.date) - ratio) < Math.abs(chart.x(chart.visible[best].date) - ratio)) best = i
    })
    setHover(best)
  }
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!chart || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
    event.preventDefault()
    const current = index ?? chart.visible.length - 1
    setHover(Math.min(chart.visible.length - 1, Math.max(0, current + (event.key === 'ArrowRight' ? 1 : -1))))
  }

  const title = liveActive ? 'Precio en vivo' : chart?.comparing ? `${symbol} frente al S&P 500` : `Precio de ${symbol}`
  const description = CHART_RANGES.find((r) => r.key === range)?.description

  return (
    <section aria-labelledby="activo-grafico" className="rounded-2xl border bg-card px-5 pt-4 pb-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="activo-grafico" className="text-xs tracking-wider text-muted-foreground uppercase">
            {title}
          </h2>
          {!liveActive && chart && (
            <p className="mt-1 text-[22px] font-semibold tracking-tight">
              <span className={up ? 'text-gain' : 'text-loss'}>{formatSignedPercent(chart.change)}</span>{' '}
              <span className="text-[13px] font-normal text-muted-foreground">
                {chart.comparing ? `${symbol} · S&P 500 ${formatSignedPercent(chart.benchChange)}` : description}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {benchmark && !liveActive && (
            <button
              type="button"
              aria-pressed={compare}
              onClick={() => onCompareChange(!compare)}
              className={cn(
                'inline-flex h-7.5 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                compare && 'border-accent-ink bg-accent hover:bg-accent',
              )}
            >
              <span aria-hidden="true" className="w-3.5 border-t-2 border-dashed border-income" />
              vs S&amp;P 500
            </button>
          )}
          <Segmented label="Rango del gráfico">
            {live && (
              <SegmentButton pressed={liveActive} onClick={live.onSelect}>
                En vivo
              </SegmentButton>
            )}
            {CHART_RANGES.map(({ key }) => (
              <SegmentButton key={key} pressed={!liveActive && range === key} onClick={() => onRangeChange(key)}>
                {key}
              </SegmentButton>
            ))}
          </Segmented>
        </div>
      </div>

      {liveActive ? (
        <div className="mt-4">{live?.content}</div>
      ) : !chart ? (
        <p className="py-20 text-center text-sm text-muted-foreground">Todavía no hay cierres suficientes para este rango.</p>
      ) : (
        <>
          <div
            role="img"
            tabIndex={0}
            aria-label={`${title}: ${formatSignedPercent(chart.change)} ${description}. Usa las flechas para recorrer los cierres.`}
            onPointerMove={move}
            onPointerLeave={() => setHover(null)}
            onKeyDown={keys}
            onBlur={() => setHover(null)}
            className="relative mt-4 h-72 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="absolute inset-y-0 right-14 left-0">
              {chart.ticks.map((_, k) => (
                <div key={k} aria-hidden="true" className="absolute inset-x-0 border-t border-border/60" style={{ top: `${((k + 0.5) / 4) * 100}%` }} />
              ))}
              <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={color} stopOpacity={0.22} />
                    <stop offset="1" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path d={`${chart.line} L1000 300 L0 300 Z`} fill={`url(#${gradientId})`} />
                {chart.benchLine && (
                  <path d={chart.benchLine} fill="none" stroke="var(--income)" strokeWidth={1.6} strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
                )}
                <path d={chart.line} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                {chart.costY !== null && (
                  <path
                    d={`M0 ${chart.costY} L1000 ${chart.costY}`}
                    stroke="var(--accent-ink)"
                    strokeWidth={1}
                    strokeDasharray="2 4"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>
              {chart.costY !== null && costBasis != null && (
                <span
                  className="absolute left-1.5 -translate-y-[120%] rounded-full border border-accent-ink bg-card px-2 py-px text-[11px] text-accent-ink"
                  style={{ top: `${(chart.costY / 300) * 100}%` }}
                >
                  Tu costo {formatUsd(costBasis)}
                </span>
              )}
              {point && index !== null && (
                <>
                  <div aria-hidden="true" className="absolute inset-y-0 border-l border-dashed border-muted-foreground" style={{ left: `${chart.x(point.date) / 10}%` }} />
                  <div
                    aria-hidden="true"
                    className="absolute -mt-1.5 -ml-1.5 size-3 rounded-full ring-4 ring-card"
                    style={{ left: `${chart.x(point.date) / 10}%`, top: `${(chart.y(chart.values[index]) / 300) * 100}%`, background: color }}
                  />
                  <div
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute top-2 rounded-xl border bg-card px-2.5 py-2 text-xs whitespace-nowrap shadow-lg',
                      chart.x(point.date) > 700 ? '-translate-x-[calc(100%+12px)]' : 'translate-x-3',
                    )}
                    style={{ left: `${chart.x(point.date) / 10}%` }}
                  >
                    <p className="text-muted-foreground">{fullDate.format(parseIsoDate(point.date))}</p>
                    <p className="mt-0.5 font-mono text-sm font-medium">{formatUsd(point.closePrice)}</p>
                    <p className={point.closePrice >= chart.visible[0].closePrice ? 'text-gain' : 'text-loss'}>
                      {formatSignedPercent((point.closePrice / chart.visible[0].closePrice - 1) * 100)} desde el inicio
                    </p>
                  </div>
                </>
              )}
            </div>
            {chart.ticks.map((tick, k) => (
              <span
                key={k}
                aria-hidden="true"
                className="absolute right-0 -translate-y-1/2 font-mono text-[11px] text-muted-foreground"
                style={{ top: `${((k + 0.5) / 4) * 100}%` }}
              >
                {chart.comparing ? formatSignedPercent(tick) : `$${Math.round(tick).toLocaleString('es-PE')}`}
              </span>
            ))}
          </div>
          <div aria-hidden="true" className="mt-1.5 mr-14 flex justify-between text-[11px] text-muted-foreground">
            {[0, 1, 2, 3].map((k) => {
              const p = chart.visible[Math.round((k / 3) * (chart.visible.length - 1))]
              return <span key={k}>{(longRange ? monthYear : dayMonth).format(parseIsoDate(p.date))}</span>
            })}
          </div>
        </>
      )}
    </section>
  )
}
