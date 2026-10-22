import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { ApiError } from '@/api/errors'
import { formatSoles } from '@/lib/format'
import { formatTerm, goalReach, type CurvePoint } from '@/lib/projections'
import { cn } from '@/lib/utils'
import type { ProjectionOutcome, ProjectionParams } from '@/types/projections'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export interface CompareGoal {
  name: string
  target: number
  /** Meses completos hasta su fecha limite. */
  deadlineMonths: number
  accumulated: number
}

interface GrowthChartProps {
  params: ProjectionParams | null
  curve: CurvePoint[] | null
  /** Del backend: null si los parametros no son validos; undefined mientras llega el primer calculo. */
  outcome: ProjectionOutcome | null | undefined
  stale: boolean
  error: ApiError | undefined
  onRetry: () => void
  goal: CompareGoal | null
  onUseContribution: (amount: number) => void
  onUseCapital: (amount: number) => void
}

/** El total al final del plazo y como se llega: lo aportado abajo, el interes compuesto encima. */
export function GrowthChart({ params, curve, outcome, stale, error, onRetry, goal, onUseContribution, onUseCapital }: GrowthChartProps) {
  return (
    <section aria-labelledby="proyeccion-curva" className="min-w-0 rounded-2xl border bg-card p-5 lg:p-6">
      {error ? (
        <ErrorState error={error} onRetry={onRetry} title="No pudimos calcular la proyección" />
      ) : outcome === null || !params || !curve ? (
        <>
          <h2 id="proyeccion-curva" className="text-base font-semibold">
            Tu proyección
          </h2>
          <p className="py-16 text-center text-sm text-muted-foreground">Corrige los parámetros para ver el resultado.</p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div aria-busy={stale} className={cn('transition-opacity', stale && 'opacity-60')}>
              <h2 id="proyeccion-curva" className="text-xs tracking-wider text-muted-foreground uppercase">
                En {formatTerm(params.periods)} tendrías
              </h2>
              {outcome ? (
                <>
                  <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatSoles(outcome.compoundFinalAmount)}</span>
                    <span className="rounded-full border border-gain/50 px-2 py-0.5 text-xs text-gain">
                      +{formatSoles(outcome.compoundFinalAmount - outcome.totalContributed)} de interés
                    </span>
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {formatSoles(outcome.totalContributed)} serían lo que aportas: {formatSoles(params.initialCapital)} de capital y{' '}
                    {formatSoles(params.monthlyContribution * params.periods)} en aportes.
                  </p>
                </>
              ) : (
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-9 w-52" />
                  <Skeleton className="h-4 w-72" />
                </div>
              )}
            </div>
            <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground" aria-label="Leyenda">
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-accent-ink" />
                Interés compuesto
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-foreground/15" />
                Lo que aportas
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-3 border-t-2 border-dashed border-muted-foreground" />
                Interés simple
              </li>
            </ul>
          </div>

          <Chart curve={pinLastPoint(curve, stale ? undefined : outcome)} goal={goal} />

          {goal && (
            <GoalNote params={params} goal={goal} onUseContribution={onUseContribution} onUseCapital={onUseCapital} />
          )}
          {/* Mientras se escribe solo se anuncia el resultado final. */}
          <p className="sr-only" aria-live="polite">
            {stale || !outcome
              ? ''
              : `Con interés compuesto llegarías a ${formatSoles(outcome.compoundFinalAmount)}, ` +
                `${formatSoles(outcome.difference)} más que con interés simple.`}
          </p>
        </>
      )}
    </section>
  )
}

/** El ultimo punto con los montos del backend, para que el cursor diga lo mismo que el resultado. */
function pinLastPoint(curve: CurvePoint[], outcome: ProjectionOutcome | undefined): CurvePoint[] {
  if (!outcome) return curve
  const last = curve[curve.length - 1]
  return [
    ...curve.slice(0, -1),
    { ...last, contributed: outcome.totalContributed, simple: outcome.simpleFinalAmount, compound: outcome.compoundFinalAmount },
  ]
}

const W = 1000
const H = 300
const STEPS = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000]

function Chart({ curve, goal }: { curve: CurvePoint[]; goal: CompareGoal | null }) {
  const [hover, setHover] = useState<number | null>(null)
  const n = curve.length - 1
  const last = curve[n]
  const top = Math.max(last.compound, last.simple, goal?.target ?? 0, 1)
  const step = STEPS.find((candidate) => top / candidate <= 4) ?? 5000000
  const yMax = Math.ceil(top / step) * step
  const x = (month: number) => (n ? (month / n) * W : 0)
  const y = (value: number) => H - (value / yMax) * H
  const left = (month: number) => `${n ? (month / n) * 100 : 0}%`
  const topOf = (value: number) => `${(1 - value / yMax) * 100}%`
  const line = (pick: (point: CurvePoint) => number) =>
    curve.map((point, i) => `${i ? 'L' : 'M'}${x(point.month).toFixed(1)} ${y(pick(point)).toFixed(1)}`).join(' ')
  const back = (pick: (point: CurvePoint) => number) =>
    [...curve].reverse().map((point) => `L${x(point.month).toFixed(1)} ${y(pick(point)).toFixed(1)}`).join(' ')

  const gridValues = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step)
  const tick = n <= 12 ? 3 : n <= 24 ? 6 : n <= 60 ? 12 : n <= 120 ? 24 : 60
  const ticks = Array.from({ length: Math.floor(n / tick) + 1 }, (_, i) => i * tick)
  if (ticks[ticks.length - 1] !== n) ticks.push(n)

  const reach = goal ? curve.find((point) => point.compound >= goal.target)?.month : undefined
  const shown = hover === null ? null : curve[hover]

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
    setHover(Math.round(ratio * n))
  }
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const from = hover ?? n
    setHover(Math.min(n, Math.max(0, from + (event.key === 'ArrowRight' ? 1 : -1))))
  }

  return (
    <div className="mt-5 flex gap-2">
      <div className="relative w-12 shrink-0 text-right text-[11px] text-muted-foreground" aria-hidden="true">
        {gridValues.map((value) => (
          <span key={value} className="absolute right-0 -translate-y-1/2" style={{ top: topOf(value) }}>
            {shortSoles(value)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div
          role="img"
          tabIndex={0}
          aria-label={`Crecimiento mes a mes durante ${formatTerm(n)}: llegarías a ${formatSoles(last.compound)} con interés compuesto. Usa las flechas para recorrer los meses.`}
          onPointerMove={track}
          onPointerLeave={() => setHover(null)}
          onKeyDown={keys}
          onBlur={() => setHover(null)}
          className="relative h-56 touch-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-64"
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
            {gridValues.map((value) => (
              <line key={value} x1={0} x2={W} y1={y(value)} y2={y(value)} stroke="var(--border)" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={`${line((p) => p.contributed)} L${W} ${H} L0 ${H} Z`} className="fill-foreground/10" />
            <path d={`${line((p) => p.compound)} ${back((p) => p.contributed)} Z`} fill="var(--accent-ink)" fillOpacity={0.8} />
            <path d={line((p) => p.compound)} fill="none" stroke="var(--accent-ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <path
              d={line((p) => p.simple)}
              fill="none"
              stroke="var(--muted-foreground)"
              strokeWidth={1.6}
              strokeDasharray="5 5"
              vectorEffect="non-scaling-stroke"
            />
            {goal && (
              <line
                x1={0}
                x2={W}
                y1={y(goal.target)}
                y2={y(goal.target)}
                stroke="var(--foreground)"
                strokeOpacity={0.7}
                strokeDasharray="2 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {goal && (
            <>
              <span
                className="absolute right-0 -translate-y-full pb-0.5 text-[11px] whitespace-nowrap [text-shadow:0_0_4px_var(--card)]"
                style={{ top: topOf(goal.target) }}
                aria-hidden="true"
              >
                Meta {goal.name} · {formatSoles(goal.target)}
              </span>
              {goal.deadlineMonths <= n && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-y-0 border-l-[1.5px] border-dashed',
                    reach !== undefined && reach <= goal.deadlineMonths ? 'border-gain' : 'border-destructive',
                  )}
                  style={{ left: left(goal.deadlineMonths) }}
                >
                  <span className="absolute -top-4 -translate-x-1/2 text-[11px] text-muted-foreground">plazo</span>
                </span>
              )}
              {reach !== undefined && (
                <span
                  aria-hidden="true"
                  className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-card"
                  style={{ left: left(reach), top: topOf(goal.target) }}
                />
              )}
            </>
          )}

          {shown && (
            <>
              <span aria-hidden="true" className="absolute inset-y-0 w-px bg-foreground/35" style={{ left: left(shown.month) }} />
              <span
                aria-hidden="true"
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-accent-ink"
                style={{ left: left(shown.month), top: topOf(shown.compound) }}
              />
              <span
                aria-hidden="true"
                className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-muted-foreground"
                style={{ left: left(shown.month), top: topOf(shown.contributed) }}
              />
              <div
                className={cn(
                  'pointer-events-none absolute top-1 rounded-lg border bg-popover px-2.5 py-2 text-xs leading-relaxed whitespace-nowrap shadow-md',
                  shown.month / Math.max(n, 1) > 0.6 ? '-translate-x-[calc(100%+10px)]' : 'translate-x-2.5',
                )}
                style={{ left: left(shown.month) }}
              >
                <strong className="font-semibold">{shown.month === 0 ? 'Hoy' : `Mes ${shown.month}`}</strong>
                <br />
                <span className="text-muted-foreground">Total</span> {formatSoles(shown.compound)}
                <br />
                <span className="text-muted-foreground">Aportado</span> {formatSoles(shown.contributed)} ·{' '}
                <span className="text-muted-foreground">interés</span> {formatSoles(shown.compound - shown.contributed)}
              </div>
            </>
          )}
        </div>
        <div className="relative mt-2 h-4 text-[11px] text-muted-foreground" aria-hidden="true">
          {ticks.map((month) => (
            <span
              key={month}
              className={cn('absolute whitespace-nowrap', month === 0 ? '' : month === n ? '-translate-x-full' : '-translate-x-1/2')}
              style={{ left: left(month) }}
            >
              {month === 0 ? 'hoy' : `${month} m`}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 2500 → "S/ 2.5 k" para el eje. */
function shortSoles(value: number): string {
  if (value < 1000) return `S/ ${value}`
  const thousands = value / 1000
  return `S/ ${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)} k`
}

function GoalNote({
  params,
  goal,
  onUseContribution,
  onUseCapital,
}: {
  params: ProjectionParams
  goal: CompareGoal
  onUseContribution: (amount: number) => void
  onUseCapital: (amount: number) => void
}) {
  const { reachMonth, needed } = goalReach(params, goal.target, goal.deadlineMonths)
  const onTime = reachMonth !== null && reachMonth <= goal.deadlineMonths
  const months = (count: number) => (count === 1 ? '1 mes' : `${count} meses`)
  const dueNow = goal.deadlineMonths === 0 && reachMonth !== 0
  let text: string
  if (reachMonth === 0) text = `Tu capital inicial ya cubre la meta ${goal.name}.`
  else if (dueNow) text = `La meta ${goal.name} vence en menos de un mes: una proyección mensual ya no alcanza a llegar a tiempo.`
  else if (onTime) text = `Llegas a la meta ${goal.name} en el mes ${reachMonth}, dentro de su plazo (${months(goal.deadlineMonths)}).`
  else if (reachMonth === null) text = `Con estos datos no llegas a la meta ${goal.name}. Para lograrlo a tiempo aporta ${formatSoles(needed)} al mes.`
  else
    text = `Llegarías a la meta ${goal.name} en el mes ${reachMonth}, ${months(reachMonth - goal.deadlineMonths)} tarde. Para llegar a tiempo aporta ${formatSoles(needed)} al mes.`

  const canUseCapital = goal.accumulated > 0 && Math.round(goal.accumulated * 100) !== Math.round(params.initialCapital * 100)

  return (
    <div className={cn('mt-4 rounded-xl px-3.5 py-3 text-[13px] leading-relaxed', onTime ? 'bg-gain/10 text-gain' : 'bg-destructive/10 text-destructive')}>
      <p>{text}</p>
      {(!onTime || canUseCapital) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {!onTime && !dueNow && needed > 0 && (
            <Button variant="outline" size="sm" className="bg-card text-foreground" onClick={() => onUseContribution(needed)}>
              Probar con {formatSoles(needed)} al mes
            </Button>
          )}
          {canUseCapital && (
            <Button variant="outline" size="sm" className="bg-card text-foreground" onClick={() => onUseCapital(goal.accumulated)}>
              Usar lo que ya llevas ({formatSoles(goal.accumulated)}) como capital
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
