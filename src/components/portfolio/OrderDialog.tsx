import { userMessage } from '@/api/errors'
import { useOrderForm, type OrderFormState, type OrderTarget } from '@/hooks/useOrderForm'
import { amountToField } from '@/lib/amount'
import { formatTokens } from '@/lib/format'
import { formatQuantity, formatSignedPercent, formatUsd } from '@/lib/market'
import { cn } from '@/lib/utils'
import type { TradeOrder } from '@/types/market'
import { FormDialogContent } from '@/components/forms/FormDialog'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export type { OrderTarget } from '@/hooks/useOrderForm'

interface OrderDialogProps {
  target: OrderTarget | null
  onOpenChange: (open: boolean) => void
  onDone: (order: TradeOrder) => void
}

export function OrderDialog({ target, onOpenChange, onDone }: OrderDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      {target && <OrderDialogContent key={`${target.assetId}-${target.side}`} target={target} onDone={onDone} />}
    </Dialog>
  )
}

function OrderDialogContent({ target, onDone }: { target: OrderTarget; onDone: (order: TradeOrder) => void }) {
  const order = useOrderForm(target, onDone)
  return (
    <FormDialogContent
      title={`${order.buying ? 'Comprar' : 'Vender'} ${target.symbol}`}
      description={target.name}
      formId="order-form"
      submitLabel={order.buying ? 'Comprar' : 'Vender'}
      pendingLabel={order.buying ? 'Comprando…' : 'Vendiendo…'}
      pending={order.form.formState.isSubmitting}
      error={order.formError}
      submitDisabled={!order.price}
    >
      <QuoteRow order={order} />
      <form id="order-form" noValidate onSubmit={order.submit}>
        <OrderFields order={order} target={target} idPrefix="order" />
      </form>
    </FormDialogContent>
  )
}

/** El precio de ahora y su variacion del dia. */
export function QuoteRow({ order }: { order: OrderFormState }) {
  const { quote } = order
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
      <span className="text-sm text-muted-foreground">Precio actual</span>
      {quote.data ? (
        <span className="text-right">
          <span className="font-semibold tabular-nums">{formatUsd(quote.data.price)}</span>
          {quote.data.changePercent !== null && (
            <span className={cn('ml-2 text-xs tabular-nums', quote.data.changePercent >= 0 ? 'text-gain' : 'text-loss')}>
              {formatSignedPercent(quote.data.changePercent)} hoy
            </span>
          )}
        </span>
      ) : quote.error ? (
        <span className="text-sm text-destructive">{userMessage(quote.error)}</span>
      ) : (
        <Skeleton className="h-5 w-24" />
      )}
    </div>
  )
}

/** En fichas o en acciones, con el atajo para usar todo y una estimacion de lo que se recibe. */
export function OrderFields({ order, target, idPrefix }: { order: OrderFormState; target: OrderTarget; idPrefix: string }) {
  const { buying, mode, switchMode, form, balance, estimate } = order
  const { errors } = form.formState
  const id = `${idPrefix}-value`

  return (
    <FieldGroup>
      {buying && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={mode}
          onValueChange={(value) => value && switchMode(value as typeof mode)}
          aria-label="Cómo quieres indicar la compra"
          className="w-fit"
        >
          <ToggleGroupItem value="tokens">En fichas</ToggleGroupItem>
          <ToggleGroupItem value="quantity">En acciones</ToggleGroupItem>
        </ToggleGroup>
      )}
      <Field data-invalid={!!errors.value}>
        <FieldLabel htmlFor={id}>{mode === 'tokens' ? 'Fichas a invertir' : 'Cantidad de acciones'}</FieldLabel>
        <div className="flex gap-2">
          <Input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder={mode === 'tokens' ? '0.00' : '0.000000'}
            aria-invalid={!!errors.value}
            className="tabular-nums"
            {...form.register('value')}
          />
          {buying && mode === 'tokens' && balance !== undefined && balance > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => form.setValue('value', amountToField(balance), { shouldValidate: true })}
            >
              Usar todo
            </Button>
          )}
          {!buying && target.held > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => form.setValue('value', String(target.held), { shouldValidate: true })}
            >
              Vender todo
            </Button>
          )}
        </div>
        {!errors.value && (
          <FieldDescription>
            {estimate ??
              (buying
                ? balance !== undefined && `Tienes ${formatTokens(balance)}. Puedes comprar fracciones de acción.`
                : `Tienes ${formatQuantity(target.held)} acciones.`)}
          </FieldDescription>
        )}
        <FieldError errors={[errors.value]} />
      </Field>
      <p className="text-xs text-muted-foreground">
        Se ejecuta al precio del momento, que puede variar un poco del que ves. 1 ficha = 1 US$.
      </p>
    </FieldGroup>
  )
}
