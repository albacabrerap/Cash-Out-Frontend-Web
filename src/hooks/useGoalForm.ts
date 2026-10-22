import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { amountToField, toCents } from '@/lib/amount'
import { applyServerFieldErrors } from '@/lib/formErrors'
import { formatSoles } from '@/lib/format'
import { GOAL_FIELD_MESSAGES, goalFormSchema, type GoalFormOutput, type GoalFormValues } from '@/lib/goalValidation'
import { goalService } from '@/services/goalService'
import type { SavingsGoal } from '@/types/goals'

const FIELDS = ['name', 'targetAmount', 'deadline'] as const

/** El estado y el envio del formulario de una meta, para usarlo en un dialogo o en el panel de Metas. */
export function useGoalForm(goal: SavingsGoal | undefined, onSaved: (goal: SavingsGoal) => void) {
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<GoalFormValues, unknown, GoalFormOutput>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: goal
      ? { name: goal.name, targetAmount: amountToField(goal.targetAmount), deadline: goal.deadline }
      : { name: '', targetAmount: '', deadline: '' },
  })

  const onSubmit = async (values: GoalFormOutput) => {
    setFormError(null)
    if (goal && toCents(values.targetAmount) < toCents(goal.accumulatedAmount)) {
      form.setError(
        'targetAmount',
        { type: 'accumulated', message: `No puede ser menor a lo que ya aportaste (${formatSoles(goal.accumulatedAmount)}).` },
        { shouldFocus: true },
      )
      return
    }
    try {
      const saved = goal ? await goalService.update(goal.id, values) : await goalService.create(values)
      toast.success(goal ? 'Meta actualizada' : 'Meta creada')
      onSaved(saved)
    } catch (err) {
      const error = toApiError(err)
      if (error.status === 409) {
        form.setError('name', { type: 'server', message: userMessage(error) }, { shouldFocus: true })
      } else if (!applyServerFieldErrors(error, form.setError, FIELDS, GOAL_FIELD_MESSAGES)) {
        setFormError(userMessage(error))
      }
    }
  }

  return { form, submit: form.handleSubmit(onSubmit), formError }
}
