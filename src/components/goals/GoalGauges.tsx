import type { CSSProperties } from 'react'
import { goalPace } from '@/lib/dashboard'
import { formatSoles } from '@/lib/format'
import { goalStatusTone, remainingAmount } from '@/lib/goals'
import { formatDayMonth } from '@/lib/movements'
import { cn } from '@/lib/utils'
import type { SavingsGoal } from '@/types/goals'
import { TONE_STROKE, TONE_TEXT } from './goalStyles'
import { GoalTarget } from './GoalTarget'

const SHOWN = 3

interface GoalGaugesProps {
  goals: SavingsGoal[]
  wide: boolean
  selectedId: number | undefined
  onSelect: (goalId: number) => void
}

/** Las metas en curso mas proximas, cada una con una marca de donde deberia ir hoy. */
export function GoalGauges({ goals, wide, selectedId, onSelect }: GoalGaugesProps) {
  const now = new Date()
  const inProgress = goals
    .filter((goal) => goal.status === 'IN_PROGRESS')
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .map((goal) => ({ goal, pace: goalPace(goal, now) }))
  if (inProgress.length === 0) return null
  const shown = inProgress.slice(0, SHOWN)

  const saved = inProgress.reduce((sum, { goal }) => sum + goal.accumulatedAmount, 0)
  const target = inProgress.reduce((sum, { goal }) => sum + goal.targetAmount, 0)
  const onTime = inProgress.filter(({ pace }) => !pace.late).length

  return (
    <section aria-labelledby="metas-ritmo" className="rounded-2xl border bg-card p-4 sm:p-5 lg:px-6">
      <h2 id="metas-ritmo" className="sr-only">
        Metas en curso
      </h2>
      <div
        className="grid items-center gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(var(--gauges),minmax(0,1fr))_15rem]"
        style={{ '--gauges': shown.length } as CSSProperties}
      >
        {shown.map(({ goal, pace }) => {
          const { label, tone } = goalStatusTone(goal, pace)
          return (
            <GoalTarget
              key={goal.id}
              goalId={goal.id}
              wide={wide}
              selected={goal.id === selectedId}
              onSelect={onSelect}
              className={cn(
                'flex items-center gap-3.5 rounded-2xl p-2 transition-colors hover:bg-muted/60',
                wide && goal.id === selectedId && 'bg-muted/70',
              )}
            >
              <span className="relative size-24 shrink-0">
                <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
                  <circle cx={60} cy={60} r={50} fill="none" stroke="var(--muted)" strokeWidth={10} />
                  <circle
                    cx={60}
                    cy={60}
                    r={50}
                    fill="none"
                    stroke={TONE_STROKE[tone]}
                    strokeWidth={10}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={`${pace.progress} 1`}
                  />
                  <line
                    x1={100}
                    y1={60}
                    x2={118}
                    y2={60}
                    stroke="var(--foreground)"
                    strokeOpacity={0.55}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    transform={`rotate(${pace.elapsed * 360} 60 60)`}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-lg font-semibold tabular-nums">
                  {Math.round(pace.progress * 100)}%
                </span>
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-[14.5px] font-semibold">{goal.name}</strong>
                <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                  faltan {formatSoles(remainingAmount(goal))} · vence {formatDayMonth(goal.deadline)}
                </span>
                <span className={cn('mt-1.5 inline-flex rounded-full border border-current px-2 py-px text-[11.5px]', TONE_TEXT[tone])}>
                  {label}
                </span>
              </span>
            </GoalTarget>
          )
        })}
        <div className="border-t pt-3 sm:col-span-2 lg:col-span-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
          <p className="text-xs tracking-wider text-muted-foreground uppercase">Ahorrado en metas</p>
          <p className="mt-1.5 text-[1.75rem] leading-tight font-semibold tracking-tight tabular-nums">{formatSoles(saved)}</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {onTime} de {inProgress.length} van a tiempo · {Math.round((saved / target) * 100)} % del total
            {inProgress.length > SHOWN && ` · aquí ves las ${SHOWN} más próximas`}
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-hidden="true" className="h-3 w-0.5 rounded-sm bg-foreground/55" />
            La marca es donde deberías ir hoy
          </p>
        </div>
      </div>
    </section>
  )
}
