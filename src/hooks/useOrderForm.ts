import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { usePolling } from '@/hooks/usePolling'
import { amountField, toCents } from '@/lib/amount'
import { formatTokens } from '@/lib/format'
import { formatQuantity, formatUsd, quantityField, quantityToTokens, tokensToQuantity } from '@/lib/market'
import { uuid } from '@/lib/uuid'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import { walletService } from '@/services/walletService'
import type { OrderSide, TradeOrder } from '@/types/market'

export interface OrderTarget {
  assetId: number
  symbol: string
  name: string
  side: OrderSide
  /** Acciones que ya tiene el usuario; limita la venta. */
  held: number
}

export type OrderMode = 'tokens' | 'quantity'

const tokensSchema = z.object({ value: amountField })
const quantitySchema = z.object({ value: quantityField })

/**
 * Una orden se arma en fichas o en acciones; las dos terminan en una cantidad
 * de acciones. Lo usan el dialogo de orden y el ticket del portafolio.
 */
export function useOrderForm(target: OrderTarget, onDone: (order: TradeOrder) => void) {
  const buying = target.side === 'BUY'
  const [mode, setMode] = useState<OrderMode>(buying ? 'tokens' : 'quantity')
  const [clientOrderId, setClientOrderId] = useState(uuid)
  const [formError, setFormError] = useState<string | null>(null)

  const quote = useApiQuery(['quote', target.assetId], (signal) => marketService.getQuote(target.assetId, signal))
  const wallet = useApiQuery(['token-wallet'], (signal) => walletService.get(signal))
  usePolling(quote.reload, 15_000)

  const price = quote.data?.price
  const balance = wallet.data?.tokenBalance

  const form = useForm<{ value: string }, unknown, { value: number }>({
    resolver: zodResolver(mode === 'tokens' ? tokensSchema : quantitySchema),
    defaultValues: { value: '' },
  })
  const typed = Number((useWatch({ control: form.control, name: 'value' }) ?? '').replace(',', '.'))

  const quantityFor = (value: number) => (mode === 'tokens' && price ? tokensToQuantity(value, price) : value)
  const estimate = price && typed > 0 ? estimateText(buying, mode, quantityFor(typed), price) : null

  const switchMode = (next: OrderMode) => {
    setMode(next)
    form.reset({ value: '' })
  }

  /** Revisa saldo y tenencia antes de mandar; devuelve la cantidad de acciones si se puede. */
  const check = (value: number): { quantity: number; tokens: number } | null => {
    setFormError(null)
    if (!price) {
      setFormError('Todavía no tenemos el precio de esta acción. Espera un momento.')
      return null
    }
    const quantity = quantityFor(value)
    const tokens = quantityToTokens(quantity, price)
    const fail = (message: string) => {
      form.setError('value', { type: 'order', message }, { shouldFocus: true })
      return null
    }
    if (quantity <= 0 || toCents(tokens) < 1) return fail('La orden tiene que valer al menos 0.01 fichas.')
    if (buying && balance !== undefined && toCents(tokens) > toCents(balance)) {
      return fail(`No te alcanzan las fichas: tienes ${formatTokens(balance)}.`)
    }
    if (!buying && quantity > target.held) return fail(`Solo tienes ${formatQuantity(target.held)} acciones.`)
    return { quantity, tokens }
  }

  /** true si la orden se ejecuto. */
  const place = async (quantity: number): Promise<boolean> => {
    try {
      const order = await portfolioService.placeOrder({ clientOrderId, assetId: target.assetId, side: target.side, quantity })
      if (order.status === 'EXECUTED') {
        toast.success(
          `${buying ? 'Compraste' : 'Vendiste'} ${formatQuantity(order.quantity)} ${order.symbol} a ${formatUsd(order.executionPrice)}`,
          { description: `${buying ? 'Pagaste' : 'Recibiste'} ${formatTokens(order.tokensMoved)}.` },
        )
        onDone(order)
        return true
      }
      // Una orden rechazada ya quedo registrada; el siguiente intento es otra orden.
      setClientOrderId(uuid())
      setFormError(order.rejectionReason ?? 'La orden fue rechazada.')
    } catch (err) {
      // Mismo clientOrderId al reintentar: si la orden si llego, el backend devuelve esa en vez de crear otra.
      setFormError(userMessage(toApiError(err)))
    }
    return false
  }

  const submit = form.handleSubmit(async ({ value }) => {
    const checked = check(value)
    if (checked) await place(checked.quantity)
  })

  return { buying, mode, switchMode, form, quote, price, balance, estimate, formError, check, place, submit }
}

export type OrderFormState = ReturnType<typeof useOrderForm>

function estimateText(buying: boolean, mode: OrderMode, quantity: number, price: number): string {
  const tokens = quantityToTokens(quantity, price)
  if (buying && mode === 'tokens') return `Recibirás ≈ ${formatQuantity(quantity)} acciones (cuestan ${formatTokens(tokens)}).`
  if (buying) return `Te costará ≈ ${formatTokens(tokens)}.`
  return `Recibirás ≈ ${formatTokens(tokens)}.`
}
