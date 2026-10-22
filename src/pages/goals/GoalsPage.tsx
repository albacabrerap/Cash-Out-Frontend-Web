import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Plus, Target } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useCreateParam } from '@/hooks/useCreateParam'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { formatSoles } from '@/lib/format'
import type { GoalGrouping } from '@/lib/goals'
import { goalService } from '@/services/goalService'
import { savingsService } from '@/services/savingsService'
import type { SavingsGoal } from '@/types/goals'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ContributionDialog } from '@/components/goals/ContributionDialog'
import { ContributionsChart } from '@/components/goals/ContributionsChart'
import { GoalBoard } from '@/components/goals/GoalBoard'
import { GoalDetailPanel } from '@/components/goals/GoalDetailPanel'
import { GoalFormDialog } from '@/components/goals/GoalFormDialog'
import { GoalGauges } from '@/components/goals/GoalGauges'
import { NewGoalPanel } from '@/components/goals/NewGoalPanel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function GoalsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const grouping: GoalGrouping = searchParams.get('agrupar') === 'fecha' ? 'fecha' : 'estado'
  const isWide = useMediaQuery('(min-width: 1024px)')
  // Sube con cada alta, aporte o borrado: todo lo de la pagina se vuelve a pedir.
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((n) => n + 1)

  const goals = useApiQuery(['goals', version], (signal) => goalService.list(signal))
  const savings = useApiQuery(['savings', version], (signal) => savingsService.get(signal))
  const ids = goals.data?.map((goal) => goal.id)
  // Los aportes de todas las metas, para el grafico y el panel; el backend no los trae juntos.
  const contributions = useApiQuery(['goal-contributions', ids ?? null, version], (signal) =>
    ids
      ? Promise.all(ids.map(async (goalId) => ({ goalId, contributions: await goalService.contributions(goalId, signal) })))
      : Promise.resolve(null),
  )

  const [creating, setCreating] = useCreateParam()
  const [selectedId, setSelectedId] = useState<number>()
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [contributing, setContributing] = useState<SavingsGoal | null>(null)

  const all = goals.data ?? []
  const inProgress = all.filter((goal) => goal.status === 'IN_PROGRESS').sort((a, b) => a.deadline.localeCompare(b.deadline))
  const usePanel = isWide && all.length > 0
  const selected = all.find((goal) => goal.id === selectedId) ?? inProgress[0] ?? all[0]
  const byGoal = contributions.data ?? undefined
  const saved = inProgress.reduce((sum, goal) => sum + goal.accumulatedAmount, 0)
  const target = inProgress.reduce((sum, goal) => sum + goal.targetAmount, 0)

  const select = (goalId: number) => {
    setSelectedId(goalId)
    if (creating) setCreating(false)
  }

  const changeGrouping = (next: GoalGrouping) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === 'fecha') params.set('agrupar', next)
        else params.delete('agrupar')
        return params
      },
      { replace: true, preventScrollReset: true },
    )

  const created = (goal: SavingsGoal) => {
    setCreating(false)
    setSelectedId(goal.id)
    refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            Tus <em className="text-accent-ink">metas</em>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {!goals.data ? (
              <span className="inline-block h-3.5 w-64 animate-pulse rounded-md bg-muted align-middle" />
            ) : inProgress.length > 0 ? (
              `${inProgress.length} en curso · ${formatSoles(saved)} ahorrados de ${formatSoles(target)}`
            ) : (
              'Aparta dinero para lo que quieres lograr y mira cuánto te falta.'
            )}
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="self-start sm:self-auto">
          <Plus aria-hidden="true" />
          Nueva meta
        </Button>
      </div>

      {goals.error && !goals.data ? (
        <ErrorState error={goals.error} onRetry={goals.reload} title="No pudimos cargar tus metas" />
      ) : goals.data && all.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Todavía no tienes metas"
          description="Una meta te ayuda a ahorrar para algo concreto: una laptop, un viaje, tu matrícula."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" />
              Crear mi primera meta
            </Button>
          }
        />
      ) : !goals.data ? (
        <div className="space-y-5" aria-busy="true">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <>
          <GoalGauges goals={all} wide={usePanel} selectedId={selected?.id} onSelect={select} />
          <div className={usePanel ? 'grid items-start gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]' : 'space-y-5'}>
            <div className="min-w-0 space-y-5">
              <GoalBoard
                goals={all}
                grouping={grouping}
                onGroupingChange={changeGrouping}
                wide={usePanel}
                selectedId={creating ? undefined : selected?.id}
                onSelect={select}
              />
              <ContributionsChart goals={all} contributions={byGoal} />
            </div>
            {usePanel &&
              (creating ? (
                <NewGoalPanel onCancel={() => setCreating(false)} onCreated={created} />
              ) : (
                selected && (
                  <GoalDetailPanel
                    key={selected.id}
                    goal={selected}
                    contributions={byGoal?.find((entry) => entry.goalId === selected.id)?.contributions}
                    available={savings.data?.availableBalance}
                    onChanged={refresh}
                    onEdit={setEditing}
                    onOtherAmount={setContributing}
                  />
                )
              ))}
          </div>
        </>
      )}

      <GoalFormDialog
        open={(creating && !usePanel) || editing !== null}
        onOpenChange={(open) => {
          if (open) return
          if (editing) setEditing(null)
          else setCreating(false)
        }}
        goal={editing ?? undefined}
        onSaved={(goal) => {
          if (editing) {
            setEditing(null)
            refresh()
          } else created(goal)
        }}
      />
      <ContributionDialog
        goal={contributing}
        onOpenChange={(open) => !open && setContributing(null)}
        onSaved={() => {
          setContributing(null)
          refresh()
        }}
      />
    </>
  )
}
