import { Plus, X } from 'lucide-react'
import type { ApiQuery } from '@/hooks/useApiQuery'
import { formatSoles } from '@/lib/format'
import { paramsSummary, sameParams } from '@/lib/projections'
import { cn } from '@/lib/utils'
import type { SavingsGoal } from '@/types/goals'
import type { Projection, ProjectionParams } from '@/types/projections'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { PROJECTION_FORM_ID } from './ParamsCard'

interface ScenarioStripProps {
  query: ApiQuery<Projection[]>
  /** Todas las metas, para nombrar la asociada aunque ya no este en progreso. */
  goals: SavingsGoal[] | undefined
  /** Lo que hay en la calculadora, si es valido. */
  current: ProjectionParams | null
  onLoad: (projection: Projection) => void
  onDelete: (projection: Projection) => void
}

/** Los escenarios guardados como fichas: un clic los vuelve a poner en la calculadora. */
export function ScenarioStrip({ query, goals, current, onLoad, onDelete }: ScenarioStripProps) {
  const count = query.data?.length

  return (
    <section aria-labelledby="proyeccion-escenarios" className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="proyeccion-escenarios" className="text-sm font-medium">
          Escenarios guardados
        </h2>
        {count !== undefined && count > 0 && (
          <p className="text-xs text-muted-foreground">Haz clic en uno para volver a verlo</p>
        )}
      </div>
      {query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={query.reload} title="No pudimos cargar tus escenarios" />
      ) : (
        <ul className="flex gap-2.5 overflow-x-auto pb-1" aria-busy={!query.data}>
          {!query.data
            ? Array.from({ length: 2 }, (_, i) => (
                <li key={i}>
                  <Skeleton className="h-[5.25rem] w-60 rounded-xl" />
                </li>
              ))
            : query.data.map((projection) => {
                const active = current !== null && sameParams(projection, current)
                const goal = goals?.find((item) => item.id === projection.savingsGoalId)
                return (
                  <li key={projection.id} className="shrink-0">
                    <div
                      className={cn(
                        'relative w-60 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-foreground/30',
                        active && 'border-accent-ink bg-accent',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          aria-label={`Usar ${projection.name} en la calculadora`}
                          aria-pressed={active}
                          onClick={() => onLoad(projection)}
                          className="truncate text-left text-[13.5px] font-semibold outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
                        >
                          {projection.name}
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar ${projection.name}`}
                          onClick={() => onDelete(projection)}
                          className="relative z-10 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{paramsSummary(projection)}</p>
                      <p className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono tabular-nums">→ {formatSoles(projection.compoundFinalAmount)}</span>
                        <span className={cn('truncate', active ? 'text-accent-ink' : 'text-muted-foreground')}>
                          {active ? 'En pantalla' : goal ? `Meta ${goal.name}` : ''}
                        </span>
                      </p>
                    </div>
                  </li>
                )
              })}
          <li className="shrink-0">
            <button
              type="submit"
              form={PROJECTION_FORM_ID}
              disabled={current === null}
              className="flex h-full min-h-[5.25rem] w-44 items-center justify-center gap-1.5 rounded-xl border border-dashed text-[13px] text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <Plus className="size-4" aria-hidden="true" />
              Guardar escenario
            </button>
          </li>
        </ul>
      )}
    </section>
  )
}
