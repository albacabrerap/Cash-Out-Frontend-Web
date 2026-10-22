import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { todayIso } from '@/lib/dates'
import { applyServerFieldErrors } from '@/lib/formErrors'
import { amountToField } from '@/lib/amount'
import { incomeFormSchema, type IncomeFormOutput, type IncomeFormValues } from '@/lib/movementValidation'
import { incomeService } from '@/services/incomeService'
import type { Income } from '@/types/movements'
import { FormDialogContent } from '@/components/forms/FormDialog'
import { Dialog } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AmountInput } from './AmountInput'

interface IncomeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  income?: Income
  onSaved: (income: Income) => void
}

export function IncomeFormDialog({ open, onOpenChange, income, onSaved }: IncomeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <IncomeForm income={income} onSaved={onSaved} />}
    </Dialog>
  )
}

const FIELDS = ['source', 'amount', 'date', 'description'] as const

function IncomeForm({ income, onSaved }: { income?: Income; onSaved: (income: Income) => void }) {
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<IncomeFormValues, unknown, IncomeFormOutput>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: income
      ? {
          source: income.source,
          amount: amountToField(income.amount),
          date: income.date,
          description: income.description ?? '',
        }
      : { source: '', amount: '', date: todayIso(), description: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = async (values: IncomeFormOutput) => {
    setFormError(null)
    try {
      const saved = income ? await incomeService.update(income.id, values) : await incomeService.create(values)
      toast.success(income ? 'Ingreso actualizado' : 'Ingreso registrado')
      onSaved(saved)
    } catch (err) {
      const error = toApiError(err)
      if (!applyServerFieldErrors(error, form.setError, FIELDS)) setFormError(userMessage(error))
    }
  }

  return (
    <FormDialogContent
      title={income ? 'Editar ingreso' : 'Registrar ingreso'}
      description={income ? 'Corrige los datos del ingreso. Tu saldo se ajusta solo.' : 'El monto se suma a tu ahorro.'}
      formId="income-form"
      submitLabel={income ? 'Guardar cambios' : 'Registrar ingreso'}
      pendingLabel="Guardando…"
      pending={isSubmitting}
      error={formError}
    >
      <form id="income-form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field data-invalid={!!errors.source}>
            <FieldLabel htmlFor="income-source">Origen</FieldLabel>
            <Input
              id="income-source"
              maxLength={100}
              placeholder="Ej.: Propina, beca, trabajo de medio tiempo"
              aria-invalid={!!errors.source}
              {...form.register('source')}
            />
            <FieldError errors={[errors.source]} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.amount}>
              <FieldLabel htmlFor="income-amount">Monto</FieldLabel>
              <AmountInput id="income-amount" aria-invalid={!!errors.amount} {...form.register('amount')} />
              {income && !errors.amount && (
                <FieldDescription>Bajarlo solo es posible si esa parte no está reservada en una meta.</FieldDescription>
              )}
              <FieldError errors={[errors.amount]} />
            </Field>
            <Field data-invalid={!!errors.date}>
              <FieldLabel htmlFor="income-date">Fecha</FieldLabel>
              <Input
                id="income-date"
                type="date"
                max={todayIso()}
                aria-invalid={!!errors.date}
                {...form.register('date')}
              />
              <FieldError errors={[errors.date]} />
            </Field>
          </div>
          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="income-description">
              Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
            </FieldLabel>
            <Textarea
              id="income-description"
              rows={2}
              maxLength={255}
              aria-invalid={!!errors.description}
              {...form.register('description')}
            />
            <FieldError errors={[errors.description]} />
          </Field>
        </FieldGroup>
      </form>
    </FormDialogContent>
  )
}
