import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { amountToField } from '@/lib/amount'
import {
  DEFAULT_PROJECTION_VALUES,
  monthsUntil,
  projectionCurve,
  projectionParamsSchema,
  projectionToFields,
  sameParams,
  type ProjectionParamsValues,
} from '@/lib/projections'
import { goalService } from '@/services/goalService'
import { projectionService } from '@/services/projectionService'
import type { Projection, ProjectionParams } from '@/types/projections'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { GrowthChart, type CompareGoal } from '@/components/projections/GrowthChart'
import { GrowthDetails } from '@/components/projections/GrowthDetails'
import { OutcomeCards } from '@/components/projections/OutcomeCards'
import { ParamsCard } from '@/components/projections/ParamsCard'
import { SaveProjectionDialog } from '@/components/projections/SaveProjectionDialog'
import { ScenarioStrip } from '@/components/projections/ScenarioStrip'

/** Espera entre teclas antes de recalcular: el resultado sale del backend. */
const PREVIEW_DELAY_MS = 300

export default function ProjectionPage() {
  const form = useForm<ProjectionParamsValues, unknown, ProjectionParams>({
    resolver: zodResolver(projectionParamsSchema),
    mode: 'onChange',
    defaultValues: DEFAULT_PROJECTION_VALUES,
  })
  const values = useWatch({ control: form.control })
  const parsed = projectionParamsSchema.safeParse(values)
  const params = parsed.success ? parsed.data : null

  const pending = useDebouncedValue(params, PREVIEW_DELAY_MS)
  const preview = useApiQuery(['projections', 'preview', pending], (signal) =>
    pending ? projectionService.preview(pending, signal) : Promise.resolve(null),
  )
  const stale = JSON.stringify(params) !== JSON.stringify(pending) || preview.isRefreshing
  // La curva se dibuja al instante con lo escrito; los montos del resultado llegan del backend.
  const curve = params ? projectionCurve(params) : null

  const saved = useApiQuery(['projections'], (signal) => projectionService.list(signal))
  const goals = useApiQuery(['goals'], (signal) => goalService.list(signal))
  const inProgress = goals.data?.filter((goal) => goal.status === 'IN_PROGRESS')
  const [goalId, setGoalId] = useState<number | null>(null)
  const [saving, setSaving] = useState<ProjectionParams | null>(null)
  const [deleting, setDeleting] = useState<Projection | null>(null)

  const picked = inProgress?.find((goal) => goal.id === goalId)
  const compare: CompareGoal | null = picked
    ? { name: picked.name, target: picked.targetAmount, deadlineMonths: monthsUntil(picked.deadline), accumulated: picked.accumulatedAmount }
    : null

  const load = (projection: Projection) => {
    form.reset(projectionToFields(projection))
    if (projection.savingsGoalId !== null && inProgress?.some((goal) => goal.id === projection.savingsGoalId)) {
      setGoalId(projection.savingsGoalId)
    }
    toast.success(`«${projection.name}» está en la calculadora`)
  }

  const setAmount = (field: 'initialCapital' | 'monthlyContribution', amount: number) =>
    form.setValue(field, amountToField(amount), { shouldValidate: true, shouldDirty: true })

  const save = (next: ProjectionParams) => {
    if (saved.data?.some((projection) => sameParams(projection, next))) {
      toast.info('Ese escenario ya está guardado.')
      return
    }
    setSaving(next)
  }

  const remove = useAsyncAction(async (projection: Projection) => {
    try {
      await projectionService.remove(projection.id)
      toast.success('Escenario eliminado')
      setDeleting(null)
      saved.reload()
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
    }
  })

  return (
    <>
      <div>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          Tu <em className="text-accent-ink">proyección</em>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mueve los valores y mira cuánto crecería tu ahorro con interés simple y con interés compuesto.
        </p>
      </div>

      <ScenarioStrip query={saved} goals={goals.data} current={params} onLoad={load} onDelete={setDeleting} />

      <div className="grid items-start gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <ParamsCard
          form={form}
          periods={params?.periods}
          onSubmit={save}
          goals={inProgress}
          goalId={picked ? goalId : null}
          onGoalChange={setGoalId}
        />
        <GrowthChart
          params={params}
          curve={curve}
          outcome={params === null ? null : preview.data}
          stale={stale}
          error={preview.error}
          onRetry={preview.reload}
          goal={compare}
          onUseContribution={(amount) => setAmount('monthlyContribution', amount)}
          onUseCapital={(amount) => setAmount('initialCapital', amount)}
        />
      </div>

      <OutcomeCards outcome={params === null ? null : preview.data} stale={stale} />
      {params && curve && <GrowthDetails params={params} curve={curve} />}

      <SaveProjectionDialog
        params={saving}
        goals={inProgress}
        defaultGoalId={picked?.id ?? null}
        onOpenChange={(open) => !open && setSaving(null)}
        onSaved={() => {
          setSaving(null)
          saved.reload()
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar este escenario?"
        description={deleting && `«${deleting.name}» se borra de tus escenarios. No cambia tu ahorro ni tus metas.`}
        confirmLabel="Eliminar escenario"
        onConfirm={() => deleting && remove.run(deleting)}
        pending={remove.isPending}
      />
    </>
  )
}
