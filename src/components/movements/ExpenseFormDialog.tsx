import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { CATEGORY_META } from '@/lib/categories'
import { todayIso } from '@/lib/dates'
import { applyServerFieldErrors } from '@/lib/formErrors'
import { formatSoles } from '@/lib/format'
import { amountToField, toCents } from '@/lib/amount'
import { expenseFormSchema, type ExpenseFormOutput, type ExpenseFormValues } from '@/lib/movementValidation'
import { expenseService } from '@/services/expenseService'
import { savingsService } from '@/services/savingsService'
import { EXPENSE_CATEGORIES, type Expense } from '@/types/movements'
import { FormDialogContent } from '@/components/forms/FormDialog'
import { Dialog } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AmountInput } from './AmountInput'

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sin gasto es un alta; con gasto, una edicion. */
  expense?: Expense
  onSaved: (expense: Expense) => void
}

export function ExpenseFormDialog({ open, onOpenChange, expense, onSaved }: ExpenseFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Se monta al abrir para que cada apertura empiece con el formulario limpio. */}
      {open && <ExpenseForm expense={expense} onSaved={onSaved} />}
    </Dialog>
  )
}

const FIELDS = ['category', 'amount', 'date', 'description'] as const

function ExpenseForm({ expense, onSaved }: { expense?: Expense; onSaved: (expense: Expense) => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const savings = useApiQuery(['savings'], (signal) => savingsService.get(signal))

  const form = useForm<ExpenseFormValues, unknown, ExpenseFormOutput>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expense
      ? {
          category: expense.category,
          amount: amountToField(expense.amount),
          date: expense.date,
          description: expense.description ?? '',
        }
      : { category: '', amount: '', date: todayIso(), description: '' },
  })
  const { errors, isSubmitting } = form.formState

  const available = savings.data?.availableBalance
  // En una edicion el saldo solo se mueve por la diferencia, asi que el monto actual cuenta como disponible.
  const spendable = available === undefined ? undefined : toCents(available) + toCents(expense?.amount ?? 0)

  const onSubmit = async (values: ExpenseFormOutput) => {
    setFormError(null)
    if (spendable !== undefined && toCents(values.amount) > spendable) {
      form.setError(
        'amount',
        { type: 'balance', message: `Supera lo que tienes disponible (${formatSoles(spendable / 100)}).` },
        { shouldFocus: true },
      )
      return
    }
    try {
      const saved = expense ? await expenseService.update(expense.id, values) : await expenseService.create(values)
      toast.success(expense ? 'Gasto actualizado' : 'Gasto registrado')
      onSaved(saved)
    } catch (err) {
      const error = toApiError(err)
      if (!applyServerFieldErrors(error, form.setError, FIELDS)) setFormError(userMessage(error))
    }
  }

  const availableHint =
    spendable === undefined
      ? null
      : expense
        ? `Puedes subirlo hasta ${formatSoles(spendable / 100)}.`
        : `Tienes ${formatSoles(spendable / 100)} disponibles para gastar.`

  return (
    <FormDialogContent
      title={expense ? 'Editar gasto' : 'Registrar gasto'}
      description={expense ? 'Corrige los datos del gasto. Tu saldo se ajusta solo.' : 'El monto se descuenta de tu ahorro disponible.'}
      formId="expense-form"
      submitLabel={expense ? 'Guardar cambios' : 'Registrar gasto'}
      pendingLabel="Guardando…"
      pending={isSubmitting}
      error={formError}
    >
      <form id="expense-form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.amount}>
              <FieldLabel htmlFor="expense-amount">Monto</FieldLabel>
              <AmountInput id="expense-amount" aria-invalid={!!errors.amount} {...form.register('amount')} />
              {availableHint && !errors.amount && <FieldDescription>{availableHint}</FieldDescription>}
              <FieldError errors={[errors.amount]} />
            </Field>
            <Field data-invalid={!!errors.date}>
              <FieldLabel htmlFor="expense-date">Fecha</FieldLabel>
              <Input
                id="expense-date"
                type="date"
                max={todayIso()}
                aria-invalid={!!errors.date}
                {...form.register('date')}
              />
              <FieldError errors={[errors.date]} />
            </Field>
          </div>
          <Field data-invalid={!!errors.category}>
            <FieldLabel htmlFor="expense-category">Categoría</FieldLabel>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="expense-category"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.category}
                    className="w-full"
                  >
                    <SelectValue placeholder="Elige una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => {
                      const { label, icon: Icon } = CATEGORY_META[category]
                      return (
                        <SelectItem key={category} value={category}>
                          <Icon aria-hidden="true" />
                          {label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.category]} />
          </Field>
          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="expense-description">
              Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
            </FieldLabel>
            <Textarea
              id="expense-description"
              rows={2}
              maxLength={255}
              placeholder="Ej.: Almuerzo en la cafetería"
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
