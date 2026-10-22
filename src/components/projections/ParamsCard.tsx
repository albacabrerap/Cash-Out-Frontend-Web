import type { ReactNode } from 'react'
import { useWatch, type FieldPath, type UseFormReturn } from 'react-hook-form'
import { formatSoles } from '@/lib/format'
import { formatTerm, RATE_PRESETS, type ProjectionParamsValues } from '@/lib/projections'
import { cn } from '@/lib/utils'
import type { SavingsGoal } from '@/types/goals'
import type { ProjectionParams } from '@/types/projections'
import { AmountInput } from '@/components/movements/AmountInput'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type ProjectionForm = UseFormReturn<ProjectionParamsValues, unknown, ProjectionParams>

interface ParamsCardProps {
  form: ProjectionForm
  /** El plazo ya validado, para mostrarlo en años. */
  periods: number | undefined
  onSubmit: (params: ProjectionParams) => void
  /** Metas en progreso para comparar la curva; undefined mientras cargan. */
  goals: SavingsGoal[] | undefined
  goalId: number | null
  onGoalChange: (goalId: number | null) => void
}

export const PROJECTION_FORM_ID = 'projection-form'

/** Cada dato se escribe o se arrastra; el deslizador cubre lo comun y el campo admite cualquier valor valido. */
export function ParamsCard({ form, periods, onSubmit, goals, goalId, onGoalChange }: ParamsCardProps) {
  const { errors } = form.formState
  const rate = Number(String(useWatch({ control: form.control, name: 'annualRatePercent' }) ?? '').replace(',', '.'))

  return (
    <section aria-labelledby="proyeccion-datos" className="rounded-2xl border bg-card p-5 lg:p-6">
      <h2 id="proyeccion-datos" className="text-base font-semibold">
        Tus datos
      </h2>
      <form id={PROJECTION_FORM_ID} noValidate onSubmit={form.handleSubmit(onSubmit)} className="mt-4">
        <FieldGroup className="gap-5">
          <SliderField
            form={form}
            name="initialCapital"
            label="Capital inicial"
            id="projection-capital"
            range={{ min: 0, max: 10000, step: 50 }}
            ends={['S/ 0', 'S/ 10,000']}
            input={<AmountInput id="projection-capital" className="text-right" aria-invalid={!!errors.initialCapital} {...form.register('initialCapital')} />}
            hint="Lo que ya tienes ahorrado."
          />
          <SliderField
            form={form}
            name="monthlyContribution"
            label="Aporte mensual"
            id="projection-contribution"
            range={{ min: 0, max: 1000, step: 10 }}
            ends={['S/ 0', 'S/ 1,000']}
            input={
              <AmountInput
                id="projection-contribution"
                className="text-right"
                aria-invalid={!!errors.monthlyContribution}
                {...form.register('monthlyContribution')}
              />
            }
            hint="Lo que sumas al final de cada mes."
          />
          <SliderField
            form={form}
            name="annualRatePercent"
            label="TEA (%)"
            id="projection-rate"
            range={{ min: 0, max: 20, step: 0.5 }}
            ends={['0 %', '20 %']}
            input={
              <div className="relative">
                <Input
                  id="projection-rate"
                  inputMode="decimal"
                  autoComplete="off"
                  className="pr-7 text-right tabular-nums"
                  aria-invalid={!!errors.annualRatePercent}
                  {...form.register('annualRatePercent')}
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden="true">
                  %
                </span>
              </div>
            }
            hint="Tasa efectiva anual, como la publican los bancos."
          >
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tasas de referencia">
              {RATE_PRESETS.map((preset) => (
                <button
                  key={preset.percent}
                  type="button"
                  aria-pressed={rate === preset.percent}
                  onClick={() =>
                    form.setValue('annualRatePercent', String(preset.percent), { shouldValidate: true, shouldDirty: true })
                  }
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    rate === preset.percent ? 'border-transparent bg-accent text-accent-ink' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {preset.label} · {preset.percent} %
                </button>
              ))}
            </div>
          </SliderField>
          <SliderField
            form={form}
            name="periods"
            label="Plazo (meses)"
            id="projection-periods"
            range={{ min: 1, max: 120, step: 1 }}
            ends={['1 mes', '10 años']}
            input={
              <Input
                id="projection-periods"
                inputMode="numeric"
                autoComplete="off"
                className="text-right tabular-nums"
                aria-invalid={!!errors.periods}
                {...form.register('periods')}
              />
            }
            hint={periods ? formatTerm(periods) : 'De 1 a 600 meses.'}
          />
        </FieldGroup>
      </form>

      <div className="mt-6 border-t pt-4">
        <p id="proyeccion-meta" className="text-[13px] text-muted-foreground">
          Compárala con una meta
        </p>
        {goals && goals.length === 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">No tienes metas en curso.</p>
        ) : (
          <div role="group" aria-labelledby="proyeccion-meta" className="mt-2 flex flex-wrap gap-1.5">
            {[null, ...(goals ?? [])].map((goal) => {
              const id = goal?.id ?? null
              return (
                <button
                  key={id ?? 'ninguna'}
                  type="button"
                  aria-pressed={goalId === id}
                  onClick={() => onGoalChange(id)}
                  className={cn(
                    'max-w-full truncate rounded-lg border px-2.5 py-1 text-[12.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    goalId === id ? 'border-accent-ink bg-accent text-foreground' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {goal ? `${goal.name} · ${formatSoles(goal.targetAmount)}` : 'Ninguna'}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

interface SliderFieldProps {
  form: ProjectionForm
  name: FieldPath<ProjectionParamsValues>
  label: string
  id: string
  range: { min: number; max: number; step: number }
  ends: [string, string]
  input: ReactNode
  hint: string
  children?: ReactNode
}

function SliderField({ form, name, label, id, range, ends, input, hint, children }: SliderFieldProps) {
  const error = form.formState.errors[name]
  const raw = useWatch({ control: form.control, name })
  const value = Number(String(raw ?? '').replace(',', '.'))
  const position = Number.isFinite(value) ? Math.min(range.max, Math.max(range.min, value)) : range.min

  return (
    <Field data-invalid={!!error} className="gap-2">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <div className="w-32">{input}</div>
      </div>
      <input
        type="range"
        aria-label={`${label}, deslizador`}
        min={range.min}
        max={range.max}
        step={range.step}
        value={position}
        onChange={(event) => form.setValue(name, event.target.value, { shouldValidate: true, shouldDirty: true })}
        className="w-full accent-accent-ink"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground" aria-hidden="true">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
      {children}
      {error ? <FieldError errors={[error]} /> : <FieldDescription>{hint}</FieldDescription>}
    </Field>
  )
}
