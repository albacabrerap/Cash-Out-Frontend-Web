import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { priceFormSchema, type PriceFormOutput, type PriceFormValues } from '@/lib/market'
import { marketService } from '@/services/marketService'
import type { Asset } from '@/types/market'
import { FormDialogContent } from '@/components/forms/FormDialog'
import { Dialog } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface PriceDialogProps {
  asset: Asset | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function PriceDialog({ asset, onOpenChange, onSaved }: PriceDialogProps) {
  return (
    <Dialog open={asset !== null} onOpenChange={onOpenChange}>
      {asset && <PriceForm asset={asset} onSaved={onSaved} />}
    </Dialog>
  )
}

function PriceForm({ asset, onSaved }: { asset: Asset; onSaved: () => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<PriceFormValues, unknown, PriceFormOutput>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: { price: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = async ({ price }: PriceFormOutput) => {
    setFormError(null)
    try {
      await marketService.setPrice(asset.id, price)
      toast.success(`Precio de ${asset.symbol} actualizado`)
      onSaved()
    } catch (err) {
      setFormError(userMessage(toApiError(err)))
    }
  }

  return (
    <FormDialogContent
      title={`Fijar el precio de ${asset.symbol}`}
      description="Reemplaza el precio actual y guarda el cierre del día. Las carteras se valoran con este precio."
      formId="price-form"
      submitLabel="Guardar precio"
      pendingLabel="Guardando…"
      pending={isSubmitting}
      error={formError}
    >
      <form id="price-form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field data-invalid={!!errors.price}>
            <FieldLabel htmlFor="asset-price">Precio</FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                {asset.currency}
              </span>
              <Input
                id="asset-price"
                inputMode="decimal"
                autoComplete="off"
                className="pl-13 tabular-nums"
                aria-invalid={!!errors.price}
                {...form.register('price')}
              />
            </div>
            {errors.price ? (
              <FieldError errors={[errors.price]} />
            ) : (
              <FieldDescription>Con hasta 4 decimales.</FieldDescription>
            )}
          </Field>
        </FieldGroup>
      </form>
    </FormDialogContent>
  )
}
