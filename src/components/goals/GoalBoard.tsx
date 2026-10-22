import { goalPace } from '@/lib/dashboard'
import { formatSoles } from '@/lib/format'
import { goalDateLine, goalStatusTone, groupGoals, type GoalGrouping } from '@/lib/goals'
import { cn } from '@/lib/utils'
import type { SavingsGoal } from '@/types/goals'
import { TONE_FILL, TONE_TEXT } from './goalStyles'
import { GoalTarget } from './GoalTarget'

const GROUPINGS: { value: GoalGrouping; label: string }[] = [
  { value: 'estado', label: 'Estado' },
  { value: 'fecha', label: 'Fecha límite' },
]

interface GoalBoardProps {
  goals: SavingsGoal[]
  grouping: GoalGrouping
  onGroupingChange: (grouping: GoalGrouping) => void
  wide: boolean
  selectedId: number | undefined
  onSelect: (goalId: number) => void
}

/** Todas las metas en columnas, por estado o por cuando vencen. */
export function GoalBoard({ goals, grouping, onGroupingChange, wide, selectedId, onSelect }: GoalBoardProps) {
  const now = new Date()
  const columns = groupGoals(goals, grouping)

  return (
    <section aria-labelledby="metas-tablero" className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <h2 id="metas-tablero" className="text-base font-semibold">
          Tablero
        </h2>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Agrupar por
          <div role="group" aria-label="Agrupar por" className="inline-flex rounded-lg bg-muted p-0.5">
            {GROUPINGS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={grouping === value}
                onClick={() => onGroupingChange(value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[12.5px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  grouping === value ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {columns.map((column) => (
          <section
            key={column.key}
            aria-labelledby={`metas-columna-${column.key}`}
            className="rounded-xl bg-muted/50 p-3 sm:min-h-72"
          >
            <h3 id={`metas-columna-${column.key}`} className="flex items-center justify-between text-[13px] font-semibold">
              {column.title}
              <span className="rounded-full border bg-card px-2 text-[11.5px] font-normal text-muted-foreground tabular-nums">
                {column.goals.length}
              </span>
            </h3>
            {column.goals.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-muted-foreground">Nada por aquí.</p>
            ) : (
              <ul className="mt-2.5 space-y-2">
                {column.goals.map((goal) => {
                  const { label, tone } = goalStatusTone(goal, goalPace(goal, now))
                  const selected = goal.id === selectedId
                  const percent = Math.min(100, Math.max(0, goal.progressPercent))
                  return (
                    <li key={goal.id}>
                      <GoalTarget
                        goalId={goal.id}
                        wide={wide}
                        selected={selected}
                        onSelect={onSelect}
                        className={cn(
                          'block w-full rounded-xl border bg-card p-3 transition-[border-color,box-shadow] hover:border-foreground/30',
                          wide && selected && 'border-accent-ink ring-3 ring-accent-ink/20',
                        )}
                      >
                        <span className="flex items-baseline justify-between gap-2">
                          <strong className="truncate text-[13.5px] font-semibold">{goal.name}</strong>
                          <span className="text-xs whitespace-nowrap tabular-nums">{Math.round(percent)} %</span>
                        </span>
                        <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                          <span className={TONE_TEXT[tone]}>{label}</span> · {goalDateLine(goal)}
                        </span>
                        <span className="mt-2.5 block h-1.5 rounded-full bg-muted">
                          <span className={cn('block h-full rounded-full', TONE_FILL[tone])} style={{ width: `${percent}%` }} />
                        </span>
                        <span className="mt-2 block truncate text-[11.5px] text-muted-foreground tabular-nums">
                          {formatSoles(goal.accumulatedAmount)} de {formatSoles(goal.targetAmount)}
                        </span>
                      </GoalTarget>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </section>
  )
}
