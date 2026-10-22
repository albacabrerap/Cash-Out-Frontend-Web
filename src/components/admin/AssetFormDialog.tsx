import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { applyServerFieldErrors } from '@/lib/formErrors'
import { ASSET_TYPE_LABEL, assetFormSchema, type AssetFormOutput, type AssetFormValues } from '@/lib/market'
import { marketService } from '@/services/marketService'
import type { AssetType } from '@/types/market'
import { FormDialogContent } from '@/components/forms/FormDialog'
import { Dialog } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const FIELDS = ['symbol', 'name', 'type', 'currency'] as const
const TYPES: AssetType[] = ['STOCK', 'ETF', 'FUND']

interface AssetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function AssetFormDialog({ open, onOpenChange, onSaved }: AssetFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <AssetForm onSaved={onSaved} />}
    </Dialog>
  )
}

function AssetForm({ onSaved }: { onSaved: () => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<AssetFormValues, unknown, AssetFormOutput>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: { symbol: '', name: '', type: 'STOCK', currency: 'USD' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = async (values: AssetFormOutput) => {
    setFormError(null)
    try {
      const created = await marketService.createAsset(values)
      toast.success(`${created.symbol} agregado`, { description: 'Fíjale un precio para que se pueda comprar.' })
      onSaved()
    } catch (err) {
      const error = toApiError(err)
      if (error.status === 409) {
        form.setError('symbol', { type: 'server', message: 'Ya existe un activo con ese símbolo.' }, { shouldFocus: true })
      } else if (!applyServerFieldErrors(error, form.setError, FIELDS)) {
        setFormError(userMessage(error))
      }
    }
  }

  return (
    <FormDialogContent
      title="Añadir activo"
      description="Para lo que Alpaca no trae. Su precio lo fijas tú; no se actualiza solo."
      formId="asset-form"
      submitLabel="Añadir activo"
      pendingLabel="Añadiendo…"
      pending={isSubmitting}
      error={formError}
    >
      <form id="asset-form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <Field data-invalid={!!errors.symbol}>
              <FieldLabel htmlFor="asset-symbol">Símbolo</FieldLabel>
              <Input
                id="asset-symbol"
                maxLength={15}
                autoComplete="off"
                className="uppercase"
                aria-invalid={!!errors.symbol}
                {...form.register('symbol')}
              />
              <FieldError errors={[errors.symbol]} />
            </Field>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="asset-name">Nombre</FieldLabel>
              <Input id="asset-name" maxLength={255} aria-invalid={!!errors.name} {...form.register('name')} />
              <FieldError errors={[errors.name]} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.type}>
              <FieldLabel htmlFor="asset-type">Tipo</FieldLabel>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="asset-type" ref={field.ref} onBlur={field.onBlur} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {ASSET_TYPE_LABEL[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.type]} />
            </Field>
            <Field data-invalid={!!errors.currency}>
              <FieldLabel htmlFor="asset-currency">Moneda</FieldLabel>
              <Input
                id="asset-currency"
                maxLength={3}
                autoComplete="off"
                className="uppercase"
                aria-invalid={!!errors.currency}
                {...form.register('currency')}
              />
              {errors.currency ? <FieldError errors={[errors.currency]} /> : <FieldDescription>Código ISO, como USD.</FieldDescription>}
            </Field>
          </div>
        </FieldGroup>
      </form>
    </FormDialogContent>
  )
}
