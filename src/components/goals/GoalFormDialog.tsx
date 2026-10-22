import { useWatch, type UseFormReturn } from 'react-hook-form'
import { useGoalForm } from '@/hooks/useGoalForm'
import { addDays, todayIso } from '@/lib/dates'
import { formatDate, formatSoles } from '@/lib/format'
import { monthlyPlan } from '@/lib/goals'
import { goalFormSchema, type GoalFormOutput, type GoalFormValues } from '@/lib/goalValidation'
import type { SavingsGoal } from '@/types/goals'
import { FormDialogContent } from '@/components/forms/FormDialog'
import { AmountInput } from '@/components/movements/AmountInput'
import { Dialog } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sin meta es un alta; con meta, una edicion. */
  goal?: SavingsGoal
  onSaved: (goal: SavingsGoal) => void
}

export function GoalFormDialog({ open, onOpenChange, goal, onSaved }: GoalFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <GoalFormDialogContent goal={goal} onSaved={onSaved} />}
    </Dialog>
  )
}

function GoalFormDialogContent({ goal, onSaved }: { goal?: SavingsGoal; onSaved: (goal: SavingsGoal) => void }) {
  const { form, submit, formError } = useGoalForm(goal, onSaved)
  return (
    <FormDialogContent
      title={goal ? 'Editar meta' : 'Nueva meta de ahorro'}
      description={
        goal
          ? 'Cambia el nombre, el monto o la fecha. Lo que ya aportaste se mantiene.'
          : 'Ponle nombre a lo que quieres lograr y aparta dinero para eso.'
      }
      formId="goal-form"
      submitLabel={goal ? 'Guardar cambios' : 'Crear meta'}
      pendingLabel="Guardando…"
      pending={form.formState.isSubmitting}
      error={formError}
    >
      <form id="goal-form" noValidate onSubmit={submit}>
        <GoalFields form={form} goal={goal} idPrefix="goal" />
      </form>
    </FormDialogContent>
  )
}

type GoalForm = UseFormReturn<GoalFormValues, unknown, GoalFormOutput>

/** Los tres campos, cuantos ya estan bien y una vista previa de cuanto apartar al mes. */
export function GoalFields({ form, goal, idPrefix }: { form: GoalForm; goal?: SavingsGoal; idPrefix: string }) {
  const { errors } = form.formState
  const values = useWatch({ control: form.control })
  const tomorrow = addDays(todayIso(), 1)

  const name = goalFormSchema.shape.name.safeParse(values.name ?? '')
  const amount = goalFormSchema.shape.targetAmount.safeParse(values.targetAmount ?? '')
  const deadline = goalFormSchema.shape.deadline.safeParse(values.deadline ?? '')
  const ready = [name.success, amount.success, deadline.success].filter(Boolean).length

  let preview = { title: 'Completa los tres datos', text: 'Con el nombre, el monto y la fecha te decimos cuánto apartar cada mes.' }
  if (name.success && amount.success && deadline.success) {
    const pending = goal ? Math.max(amount.data - goal.accumulatedAmount, 0) : amount.data
    const plan = monthlyPlan(pending, deadline.data)
    const months = plan ? Math.round(plan.months) : 0
    preview = {
      title: `${name.data} · ${formatSoles(amount.data)}`,
      text:
        pending === 0
          ? 'Con lo que ya aportaste la meta queda cumplida.'
          : !plan || plan.months < 1
            ? `Vence en menos de un mes: tendrías que juntar ${formatSoles(pending)} antes del ${formatDate(deadline.data)}.`
            : `${goal ? `Te faltarían ${formatSoles(pending)}. ` : ''}Para llegar al ${formatDate(deadline.data)} aparta ${formatSoles(plan.perMonth)} al mes (${months} ${months === 1 ? 'mes' : 'meses'}).`,
    }
  }

  return (
    <FieldGroup>
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
        <span aria-hidden="true" className="h-1.5 flex-1 rounded-full bg-muted">
          <span className="block h-full rounded-full bg-accent-ink transition-[width] duration-300" style={{ width: `${(ready / 3) * 100}%` }} />
        </span>
        {ready} de 3 datos listos
      </div>
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor={`${idPrefix}-name`}>Nombre</FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          maxLength={120}
          placeholder="Ej.: Laptop para la universidad"
          aria-invalid={!!errors.name}
          {...form.register('name')}
        />
        <FieldError errors={[errors.name]} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.targetAmount}>
          <FieldLabel htmlFor={`${idPrefix}-target`}>Monto objetivo</FieldLabel>
          <AmountInput id={`${idPrefix}-target`} aria-invalid={!!errors.targetAmount} {...form.register('targetAmount')} />
          {goal && goal.accumulatedAmount > 0 && !errors.targetAmount && (
            <FieldDescription>Ya aportaste {formatSoles(goal.accumulatedAmount)}.</FieldDescription>
          )}
          <FieldError errors={[errors.targetAmount]} />
        </Field>
        <Field data-invalid={!!errors.deadline}>
          <FieldLabel htmlFor={`${idPrefix}-deadline`}>Fecha límite</FieldLabel>
          <Input
            id={`${idPrefix}-deadline`}
            type="date"
            min={tomorrow}
            aria-invalid={!!errors.deadline}
            {...form.register('deadline')}
          />
          <FieldError errors={[errors.deadline]} />
        </Field>
      </div>
      <div aria-live="polite" className="rounded-xl border border-dashed p-3.5">
        <p className="text-xs tracking-wider text-muted-foreground uppercase">Vista previa</p>
        <p className="mt-1.5 text-sm font-semibold break-words">{preview.title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{preview.text}</p>
      </div>
    </FieldGroup>
  )
}
