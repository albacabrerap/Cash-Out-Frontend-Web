import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, LineChart } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { formatChange } from '@/lib/format'
import { applyServerFieldErrors } from '@/lib/formErrors'
import { choiceMeta } from '@/lib/updown'
import { updownCaseFormSchema, type UpDownCaseFormOutput, type UpDownCaseFormValues } from '@/lib/updownCases'
import { updownCaseService } from '@/services/updownCaseService'
import type { UpDownCase, UpDownPreview } from '@/types/updownCases'
import { FormDialogContent } from '@/components/forms/FormDialog'
import { UpDownChart } from '@/components/updown/UpDownChart'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const FIELDS = ['symbol', 'cutoff', 'sector', 'name', 'context', 'lesson'] as const

interface UpDownCaseDialogProps {
  /** null cerrado; 'new' para crear; un caso para editarlo. */
  target: UpDownCase | 'new' | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function UpDownCaseDialog({ target, onOpenChange, onSaved }: UpDownCaseDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      {target && <CaseForm item={target === 'new' ? null : target} onSaved={onSaved} />}
    </Dialog>
  )
}

function defaults(item: UpDownCase | null): UpDownCaseFormValues {
  if (!item) return { symbol: '', cutoff: '', sector: '', name: '', context: '', lesson: '', active: true }
  return {
    symbol: item.symbol,
    cutoff: item.cutoff,
    sector: item.sector,
    name: item.name,
    context: item.context,
    lesson: item.lesson,
    active: item.active,
  }
}

type PreviewState = { key: string; data?: UpDownPreview; error?: string; loading?: boolean }

function CaseForm({ item, onSaved }: { item: UpDownCase | null; onSaved: () => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  // Al editar se muestra de entrada lo que paso, para revisar la leccion contra el resultado.
  const [preview, setPreview] = useState<PreviewState | null>(() =>
    item ? { key: `${item.symbol}@${item.cutoff}`, loading: true } : null,
  )
  const form = useForm<UpDownCaseFormValues, unknown, UpDownCaseFormOutput>({
    resolver: zodResolver(updownCaseFormSchema),
    defaultValues: defaults(item),
  })
  const { errors, isSubmitting } = form.formState
  const [symbol, cutoff] = useWatch({ control: form.control, name: ['symbol', 'cutoff'] })
  const key = `${symbol.trim().toUpperCase()}@${cutoff}`
  const shown = preview?.key === key ? preview : null

  const loadPreview = async () => {
    const valid = await form.trigger(['symbol', 'cutoff'])
    if (!valid) return
    setPreview({ key, loading: true })
    try {
      setPreview({ key, data: await updownCaseService.preview(symbol.trim().toUpperCase(), cutoff) })
    } catch (err) {
      setPreview({ key, error: userMessage(toApiError(err)) })
    }
  }

  useEffect(() => {
    if (!item) return
    let alive = true
    const opened = `${item.symbol}@${item.cutoff}`
    updownCaseService
      .preview(item.symbol, item.cutoff)
      .then((data) => alive && setPreview({ key: opened, data }))
      .catch((err: unknown) => alive && setPreview({ key: opened, error: userMessage(toApiError(err)) }))
    return () => {
      alive = false
    }
  }, [item])

  const onSubmit = async (values: UpDownCaseFormOutput) => {
    setFormError(null)
    try {
      if (item) await updownCaseService.update(item.id, values)
      else await updownCaseService.create(values)
      toast.success(item ? 'Caso actualizado' : 'Caso agregado al banco')
      onSaved()
    } catch (err) {
      const error = toApiError(err)
      if (error.status === 409) {
        form.setError('symbol', { type: 'server', message: 'Ya hay un caso de ese activo para ese día.' }, { shouldFocus: true })
      } else if (!applyServerFieldErrors(error, form.setError, FIELDS)) {
        setFormError(userMessage(error))
      }
    }
  }

  return (
    <FormDialogContent
      title={item ? 'Editar caso' : 'Agregar caso'}
      description="Un activo, el día de una noticia y lo que se cuenta al revelar. El resultado sale de los cierres reales."
      formId="updown-case-form"
      submitLabel={item ? 'Guardar cambios' : 'Agregar caso'}
      pendingLabel="Guardando…"
      pending={isSubmitting}
      error={formError}
      className="max-h-[92svh] overflow-y-auto sm:max-w-2xl"
    >
      <form id="updown-case-form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
            <Field data-invalid={!!errors.symbol}>
              <FieldLabel htmlFor="case-symbol">Activo</FieldLabel>
              <Input
                id="case-symbol"
                maxLength={12}
                autoComplete="off"
                placeholder="SPY"
                className="font-mono uppercase"
                aria-invalid={!!errors.symbol}
                {...form.register('symbol')}
              />
              <FieldError errors={[errors.symbol]} />
            </Field>
            <Field data-invalid={!!errors.cutoff}>
              <FieldLabel htmlFor="case-cutoff">Día de la noticia</FieldLabel>
              <Input id="case-cutoff" type="date" aria-invalid={!!errors.cutoff} {...form.register('cutoff')} />
              <FieldError errors={[errors.cutoff]} />
            </Field>
            <Button type="button" variant="outline" className="sm:mt-6" onClick={() => void loadPreview()} disabled={shown?.loading}>
              {shown?.loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LineChart aria-hidden="true" />}
              Ver qué pasó
            </Button>
          </div>

          <PreviewBox preview={shown} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.sector}>
              <FieldLabel htmlFor="case-sector">Pista</FieldLabel>
              <Input id="case-sector" maxLength={60} placeholder="Índice tecnológico" aria-invalid={!!errors.sector} {...form.register('sector')} />
              {errors.sector ? <FieldError errors={[errors.sector]} /> : <FieldDescription>Se ve antes de revelar.</FieldDescription>}
            </Field>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="case-name">Qué era</FieldLabel>
              <Input id="case-name" maxLength={160} placeholder="el Nasdaq 100 (QQQ)" aria-invalid={!!errors.name} {...form.register('name')} />
              {errors.name ? <FieldError errors={[errors.name]} /> : <FieldDescription>Se lee "Era …, el 15 de junio de 2022".</FieldDescription>}
            </Field>
          </div>
          <Field data-invalid={!!errors.context}>
            <FieldLabel htmlFor="case-context">Noticia</FieldLabel>
            <Textarea id="case-context" rows={2} maxLength={300} aria-invalid={!!errors.context} {...form.register('context')} />
            {errors.context ? <FieldError errors={[errors.context]} /> : <FieldDescription>Lo que pasó ese día, sin adelantar el resultado.</FieldDescription>}
          </Field>
          <Field data-invalid={!!errors.lesson}>
            <FieldLabel htmlFor="case-lesson">Lección</FieldLabel>
            <Textarea id="case-lesson" rows={3} maxLength={600} aria-invalid={!!errors.lesson} {...form.register('lesson')} />
            {errors.lesson ? (
              <FieldError errors={[errors.lesson]} />
            ) : (
              <FieldDescription>Por qué se movió así. Escríbela mirando el resultado de "Ver qué pasó".</FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="case-active">Estado</FieldLabel>
            <Controller
              control={form.control}
              name="active"
              render={({ field }) => (
                <Select value={field.value ? 'on' : 'off'} onValueChange={(value) => field.onChange(value === 'on')}>
                  <SelectTrigger id="case-active" ref={field.ref} onBlur={field.onBlur} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on">Activo: puede salir en las partidas</SelectItem>
                    <SelectItem value="off">Inactivo: se guarda, pero no sale</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </FieldGroup>
      </form>
    </FormDialogContent>
  )
}

function PreviewBox({ preview }: { preview: PreviewState | null }) {
  if (!preview || preview.loading) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        {preview?.loading ? 'Bajando los cierres…' : 'Elige el activo y el día, y mira qué pasó el mes siguiente antes de escribir la lección.'}
      </p>
    )
  }
  if (preview.error) {
    return (
      <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
        {preview.error}
      </p>
    )
  }
  const data = preview.data!
  const meta = choiceMeta(data.outcome)
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm">
        El mes siguiente:{' '}
        <strong className={cn('font-mono', meta.tone)}>
          {meta.icon} {meta.label} {formatChange(data.changePercent)}
        </strong>
      </p>
      <UpDownChart past={data.past} future={data.future} outcome={data.outcome} compact className="mt-3 h-28" />
    </div>
  )
}
