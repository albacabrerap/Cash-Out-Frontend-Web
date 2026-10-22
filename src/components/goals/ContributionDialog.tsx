import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { amountToField, toCents } from '@/lib/amount'
import { applyServerFieldErrors } from '@/lib/formErrors'
import { formatSoles } from '@/lib/format'
import { remainingAmount } from '@/lib/goals'
import { contributionFormSchema, type ContributionFormOutput, type ContributionFormValues } from '@/lib/goalValidation'
import { goalService } from '@/services/goalService'
import { savingsService } from '@/services/savingsService'
import type { SavingsGoal } from '@/types/goals'
import { FormDialogContent } from '@/components/forms/FormDialog'
import { AmountInput } from '@/components/movements/AmountInput'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { announceContribution } from './announceContribution'

interface ContributionDialogProps {
  goal: SavingsGoal | null
  onOpenChange: (open: boolean) => void
  /** `completed` si este aporte cumplio la meta. */
  onSaved: (result: { completed: boolean }) => void
}

/** Un aporte no mueve dinero: reserva parte del saldo disponible para la meta. */
export function ContributionDialog({ goal, onOpenChange, onSaved }: ContributionDialogProps) {
  return (
    <Dialog open={goal !== null} onOpenChange={onOpenChange}>
      {goal && <ContributionForm goal={goal} onSaved={onSaved} />}
    </Dialog>
  )
}

function ContributionForm({ goal, onSaved }: { goal: SavingsGoal; onSaved: (result: { completed: boolean }) => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const savings = useApiQuery(['savings'], (signal) => savingsService.get(signal))
  const available = savings.data?.availableBalance
  const remaining = remainingAmount(goal)
  const noFunds = available !== undefined && toCents(available) <= 0

  const form = useForm<ContributionFormValues, unknown, ContributionFormOutput>({
    resolver: zodResolver(contributionFormSchema),
    defaultValues: { amount: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = async (values: ContributionFormOutput) => {
    setFormError(null)
    const cents = toCents(values.amount)
    if (cents > toCents(remaining)) {
      form.setError('amount', { type: 'remaining', message: `Supera lo que te falta (${formatSoles(remaining)}).` })
      return
    }
    if (available !== undefined && cents > toCents(available)) {
      form.setError('amount', { type: 'balance', message: `Supera lo que tienes disponible (${formatSoles(available)}).` })
      return
    }
    try {
      await goalService.contribute(goal.id, { amount: values.amount, source: 'MANUAL' })
      const completed = cents === toCents(remaining)
      announceContribution(goal, completed)
      onSaved({ completed })
    } catch (err) {
      const error = toApiError(err)
      if (!applyServerFieldErrors(error, form.setError, ['amount'], { amount: 'Revisa el monto del aporte.' })) {
        setFormError(userMessage(error))
      }
    }
  }

  const canFillRemaining = available !== undefined && toCents(remaining) > 0 && toCents(remaining) <= toCents(available)

  return (
    <FormDialogContent
      title={`Aportar a "${goal.name}"`}
      description="El aporte aparta parte de tu saldo disponible para esta meta."
      formId="contribution-form"
      submitLabel="Aportar"
      pendingLabel="Aportando…"
      pending={isSubmitting}
      error={formError}
      submitDisabled={noFunds}
    >
      {noFunds ? (
        <Alert>
          <Info aria-hidden="true" />
          <AlertDescription>
            <p>No tienes saldo disponible para aportar.</p>
            <Link to="/movimientos/ingresos?nuevo=1" className="font-medium text-foreground underline underline-offset-4">
              Registra un ingreso primero
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <form id="contribution-form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field data-invalid={!!errors.amount}>
              <FieldLabel htmlFor="contribution-amount">Monto del aporte</FieldLabel>
              <AmountInput id="contribution-amount" autoFocus aria-invalid={!!errors.amount} {...form.register('amount')} />
              {!errors.amount && (
                <FieldDescription>
                  Te faltan {formatSoles(remaining)} para cumplirla
                  {available !== undefined && <> y tienes {formatSoles(available)} disponibles</>}.
                </FieldDescription>
              )}
              <FieldError errors={[errors.amount]} />
            </Field>
            {canFillRemaining && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-fit"
                onClick={() => form.setValue('amount', amountToField(remaining), { shouldValidate: true })}
              >
                Aportar lo que falta ({formatSoles(remaining)})
              </Button>
            )}
          </FieldGroup>
        </form>
      )}
    </FormDialogContent>
  )
}
