import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Plus, Target } from 'lucide-react'
import type { ApiQuery } from '@/hooks/useApiQuery'
import { goalPace } from '@/lib/dashboard'
import { formatDate, formatSoles } from '@/lib/format'
import type { SavingsGoal } from '@/types/goals'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const SHOWN = 3

/** Las metas en curso, cada una contra el tiempo que ya paso de su plazo. */
export function GoalsPaceCard({ query }: { query: ApiQuery<SavingsGoal[]> }) {
  const [picked, setPicked] = useState<number>()
  const today = new Date()
  const goals = (query.data ?? [])
    .filter((g) => g.status === 'IN_PROGRESS')
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .map((goal) => ({ goal, pace: goalPace(goal, today) }))
  const shown = goals.slice(0, SHOWN)
  const late = goals.filter((g) => g.pace.late).length
  const target = goals.reduce((sum, g) => sum + g.goal.targetAmount, 0)
  const saved = goals.reduce((sum, g) => sum + g.goal.accumulatedAmount, 0)
  const selected = shown.find((g) => g.goal.id === picked) ?? shown.find((g) => g.pace.late) ?? shown[0]

  return (
    <section aria-labelledby="resumen-metas" className="flex min-h-[28rem] flex-col rounded-2xl border bg-card pt-5">
      <div className="flex items-start justify-between px-5">
        <div>
          <h2 id="resumen-metas" className="font-semibold">
            Tus metas
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Avance frente al tiempo que ya pasó</p>
        </div>
        {goals.length > 0 && (
          <Link to="/metas" className="flex items-center gap-1 text-[13px] font-medium whitespace-nowrap underline-offset-4 hover:underline">
            Ver todas
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={query.reload} title="No pudimos cargar tus metas" className="m-5 flex-1" />
      ) : !query.data ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-5 pb-5 text-center">
          <span aria-hidden="true" className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Target className="size-5" />
          </span>
          <strong className="text-sm font-semibold">No tienes metas en curso</strong>
          <span className="max-w-60 text-[13px] text-muted-foreground">Ponle nombre, monto y fecha a algo que quieras lograr.</span>
          <Button asChild size="sm" className="mt-1">
            <Link to="/metas?nuevo=1">
              <Plus aria-hidden="true" />
              Crear una meta
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mx-5 mt-3.5 grid grid-cols-3 border-y py-3">
            <p>
              <span className="block text-[1.375rem] font-semibold tabular-nums">{Math.round((saved / target) * 100)} %</span>
              <span className="text-[11.5px] text-muted-foreground">ahorrado</span>
            </p>
            <p>
              <span className="block text-[1.375rem] font-semibold tabular-nums">
                {goals.length - late} de {goals.length}
              </span>
              <span className="text-[11.5px] text-muted-foreground">van a tiempo</span>
            </p>
            <p>
              <span className={cn('block text-[1.375rem] font-semibold tabular-nums', late > 0 && 'text-destructive')}>{late}</span>
              <span className="text-[11.5px] text-muted-foreground">{late === 1 ? 'atrasada' : 'atrasadas'}</span>
            </p>
          </div>
          <ul className="mt-1.5 px-2">
            {shown.map(({ goal, pace }) => (
              <li key={goal.id}>
                <button
                  type="button"
                  aria-pressed={goal.id === selected?.goal.id}
                  onClick={() => setPicked(goal.id)}
                  className={cn(
                    'w-full rounded-xl px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring',
                    goal.id === selected?.goal.id && 'bg-muted/70',
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <strong className="truncate text-[13.5px] font-semibold">{goal.name}</strong>
                    <span className={cn('text-[11.5px] font-medium', pace.late ? 'text-destructive' : 'text-gain')}>
                      {pace.late ? 'Atrasada' : 'A tiempo'}
                    </span>
                  </span>
                  <span className="mt-2 flex items-center gap-2.5">
                    <span className="relative h-1.5 flex-1 rounded-full bg-border">
                      <span
                        className={cn('absolute inset-y-0 left-0 rounded-full', pace.late ? 'bg-destructive' : 'bg-accent-ink')}
                        style={{ width: `${pace.progress * 100}%` }}
                      />
                      <span
                        aria-hidden="true"
                        className="absolute -inset-y-1 w-0.5 rounded-sm bg-foreground/55"
                        style={{ left: `${pace.elapsed * 100}%` }}
                      />
                    </span>
                    <span className="w-9 text-right font-mono text-xs tabular-nums">{Math.round(pace.progress * 100)}%</span>
                  </span>
                  <span className="mt-1.5 block text-[11.5px] text-muted-foreground">
                    {formatSoles(goal.accumulatedAmount)} de {formatSoles(goal.targetAmount)} · vence el {formatDate(goal.deadline)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {selected && (
            <p
              className={cn(
                'mx-5 mt-auto mb-5 rounded-xl p-3 text-[13px] leading-relaxed',
                selected.pace.late ? 'bg-destructive/10' : 'bg-accent',
              )}
            >
              {selected.pace.late
                ? `${selected.goal.name} va ${Math.round((selected.pace.elapsed - selected.pace.progress) * 100)} puntos detrás del ritmo. `
                : `${selected.goal.name} va a buen ritmo. `}
              {selected.pace.dueSoon
                ? `Para llegar al ${formatDate(selected.goal.deadline)} te faltan ${formatSoles(selected.pace.remaining)}.`
                : `Para llegar al ${formatDate(selected.goal.deadline)} aparta ${formatSoles(selected.pace.perMonth)} al mes.`}
            </p>
          )}
        </>
      )}
    </section>
  )
}
