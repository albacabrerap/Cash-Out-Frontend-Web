import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { applyServerFieldErrors } from '@/lib/formErrors'
import {
  NO_GOAL,
  paramsSummary,
  SAVE_PROJECTION_FIELD_MESSAGES,
  saveProjectionSchema,
  type SaveProjectionOutput,
  type SaveProjectionValues,
} from '@/lib/projections'
import { projectionService } from '@/services/projectionService'
import type { SavingsGoal } from '@/types/goals'
import type { Projection, ProjectionParams } from '@/types/projections'
import { FormDialogContent } from '@/components/forms/FormDialog'
import { Dialog } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SaveProjectionDialogProps {
  /** Los parametros ya validados; null con el dialogo cerrado. */
  params: ProjectionParams | null
  /** Las metas en progreso, para asociar el escenario. undefined mientras cargan. */
  goals: SavingsGoal[] | undefined
  /** La meta con la que se esta comparando, para proponerla. */
  defaultGoalId?: number | null
  onOpenChange: (open: boolean) => void
  onSaved: (projection: Projection) => void
}

export function SaveProjectionDialog({ params, goals, defaultGoalId, onOpenChange, onSaved }: SaveProjectionDialogProps) {
  return (
    <Dialog open={params !== null} onOpenChange={onOpenChange}>
      {params && <SaveProjectionForm params={params} goals={goals} defaultGoalId={defaultGoalId ?? null} onSaved={onSaved} />}
    </Dialog>
  )
}

function SaveProjectionForm({
  params,
  goals,
  defaultGoalId,
  onSaved,
}: {
  params: ProjectionParams
  goals: SavingsGoal[] | undefined
  defaultGoalId: number | null
  onSaved: (projection: Projection) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<SaveProjectionValues, unknown, SaveProjectionOutput>({
    resolver: zodResolver(saveProjectionSchema),
    defaultValues: { name: '', goal: defaultGoalId === null ? NO_GOAL : String(defaultGoalId) },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = async ({ name, goal }: SaveProjectionOutput) => {
    setFormError(null)
    try {
      const saved = await projectionService.create({ ...params, name, savingsGoalId: goal })
      toast.success('Escenario guardado')
      onSaved(saved)
    } catch (err) {
      const error = toApiError(err)
      if (error.status === 404 && goal !== null) {
        form.setError('goal', { type: 'server', message: 'Esa meta ya no existe. Elige otra o ninguna.' })
      } else if (!applyServerFieldErrors(error, form.setError, ['name'], SAVE_PROJECTION_FIELD_MESSAGES)) {
        setFormError(userMessage(error))
      }
    }
  }

  return (
    <FormDialogContent
      title="Guardar escenario"
      description={paramsSummary(params)}
      formId="save-projection-form"
      submitLabel="Guardar"
      pendingLabel="Guardando…"
      pending={isSubmitting}
      error={formError}
    >
      <form id="save-projection-form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="projection-name">Nombre</FieldLabel>
            <Input
              id="projection-name"
              maxLength={120}
              placeholder="Ej.: Ahorro para la laptop"
              aria-invalid={!!errors.name}
              {...form.register('name')}
            />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field data-invalid={!!errors.goal}>
            <FieldLabel htmlFor="projection-goal">Meta</FieldLabel>
            <Controller
              control={form.control}
              name="goal"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!goals}>
                  <SelectTrigger
                    id="projection-goal"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.goal}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_GOAL}>Sin meta</SelectItem>
                    {goals?.map((goal) => (
                      <SelectItem key={goal.id} value={String(goal.id)}>
                        {goal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.goal ? (
              <FieldError errors={[errors.goal]} />
            ) : (
              <FieldDescription>
                {goals?.length === 0 ? 'No tienes metas en progreso.' : 'Opcional: la meta para la que estás planeando.'}
              </FieldDescription>
            )}
          </Field>
        </FieldGroup>
      </form>
    </FormDialogContent>
  )
}
