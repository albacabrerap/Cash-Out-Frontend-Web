import { useId, useState } from 'react'
import { Loader2, TriangleAlert, X } from 'lucide-react'
import { CATEGORY_META } from '@/lib/categories'
import { CONFIDENT, formProblem, PAYMENT_LABEL, WARNING_TEXT, type DraftForm } from '@/lib/assistant'
import type { Draft } from '@/types/assistant'
import { EXPENSE_CATEGORIES } from '@/types/movements'
import { SegmentButton, Segmented } from '@/components/filters/Segmented'
import { AmountInput } from '@/components/movements/AmountInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface DraftCardProps {
  draft: Draft
  form: DraftForm
  onChange: (form: DraftForm) => void
  onSave: () => void
  onDiscard: () => void
  saving: boolean
  /** El error del ultimo intento de guardar, como "No tienes saldo suficiente". */
  error: string | null
}

/** Una tarjeta que el usuario revisa antes de guardar: todo se puede cambiar. */
export function DraftCard({ draft, form, onChange, onSave, onDiscard, saving, error }: DraftCardProps) {
  const id = useId()
  const [touched, setTouched] = useState(false)
  const problem = formProblem(form)
  const expense = form.kind === 'EXPENSE'
  const alternatives = new Set(draft.alternatives.map((option) => option.category))
  const unsure = draft.source !== 'USER_RULE' && draft.confidence < CONFIDENT
  const set = (change: Partial<DraftForm>) => onChange({ ...form, ...change })

  return (
    <li className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Segmented label="Tipo de movimiento" className="shrink-0">
          <SegmentButton pressed={expense} onClick={() => set({ kind: 'EXPENSE', category: form.category ?? draft.category ?? 'OTHER' })}>
            Gasto
          </SegmentButton>
          <SegmentButton pressed={!expense} onClick={() => set({ kind: 'INCOME' })}>
            Ingreso
          </SegmentButton>
        </Segmented>
        {draft.paymentMethod && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{PAYMENT_LABEL[draft.paymentMethod]}</span>
        )}
        <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={onDiscard} aria-label="Descartar esta tarjeta">
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem]">
        <div>
          <label htmlFor={`${id}-desc`} className="text-xs text-muted-foreground">
            Descripción
          </label>
          <Input
            id={`${id}-desc`}
            value={form.description}
            maxLength={255}
            placeholder={expense ? '¿En qué fue?' : '¿De dónde vino?'}
            onChange={(event) => set({ description: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`${id}-amount`} className="text-xs text-muted-foreground">
            Monto
          </label>
          <AmountInput
            id={`${id}-amount`}
            value={form.amount}
            aria-invalid={touched && !!problem && problem.includes('monto')}
            onChange={(event) => set({ amount: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`${id}-date`} className="text-xs text-muted-foreground">
            Fecha
          </label>
          <Input id={`${id}-date`} type="date" value={form.date} onChange={(event) => set({ date: event.target.value })} />
        </div>
      </div>

      {expense && (
        <fieldset className="mt-3">
          <legend className="text-xs text-muted-foreground">
            Categoría
            {draft.category &&
              (draft.source === 'USER_RULE'
                ? ' · según lo que corregiste antes'
                : unsure
                  ? ' · no estamos seguros: revisa'
                  : ' · sugerida')}
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {EXPENSE_CATEGORIES.map((category) => {
              const meta = CATEGORY_META[category]
              const Icon = meta.icon
              const selected = form.category === category
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => set({ category })}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'border-accent-ink bg-accent font-medium' : 'hover:bg-muted',
                    !selected && unsure && alternatives.has(category) && 'border-dashed border-accent-ink/60',
                  )}
                >
                  <Icon className="size-3.5" style={{ color: meta.color }} aria-hidden="true" />
                  {meta.label}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      {draft.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {draft.warnings.map((warning) => (
            <li key={warning} className="flex items-center gap-1.5">
              <TriangleAlert className="size-3.5 shrink-0 text-accent-ink" aria-hidden="true" />
              {WARNING_TEXT[warning]}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        {(error || (touched && problem)) && (
          <p role="alert" className="mr-auto text-sm text-destructive">
            {error ?? problem}
          </p>
        )}
        <Button
          onClick={() => {
            setTouched(true)
            if (!problem) onSave()
          }}
          disabled={saving}
        >
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          Guardar {expense ? 'gasto' : 'ingreso'}
        </Button>
      </div>
    </li>
  )
}
