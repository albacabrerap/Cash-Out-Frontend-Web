import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/format'
import { formatQuantity, formatSignedTokens, formatUsd } from '@/lib/market'
import { rejectionTip, signedTokens } from '@/lib/orders'
import { cn } from '@/lib/utils'
import type { TradeOrder } from '@/types/market'
import { Button } from '@/components/ui/button'
import { OrderStatusPill } from './OrderStatusPill'

interface OrderReceiptProps {
  order: TradeOrder
  name: string | undefined
  /** Abre el ticket con la misma operacion: repetirla o intentarla de nuevo. */
  onRepeat: (order: TradeOrder) => void
  className?: string
}

function receiptLines(order: TradeOrder): [string, string][] {
  const done = order.status === 'EXECUTED'
  return [
    ['Cantidad', formatQuantity(order.quantity)],
    ['Precio', formatUsd(order.executionPrice)],
    ['Tasa', order.tokenRate ? `1 ficha = ${order.tokenRate} US$` : '—'],
    ...(done ? [['Fichas movidas', formatSignedTokens(signedTokens(order))] as [string, string]] : []),
    ['Enviada', formatDateTime(order.createdAt)],
    [done ? 'Ejecutada' : 'Resuelta', formatDateTime(order.executedAt ?? order.createdAt)],
  ]
}

function receiptText(order: TradeOrder, name: string | undefined): string {
  const title = `${order.side === 'BUY' ? 'Compra' : 'Venta'} de ${order.symbol}${name ? ` (${name})` : ''}`
  const lines = receiptLines(order).map(([key, value]) => `${key}: ${value}`)
  return [`Cash-Out · Orden N.º ${String(order.id).padStart(6, '0')}`, title, ...lines, order.rejectionReason ?? ''].filter(Boolean).join('\n')
}

/** El detalle de una orden como comprobante, con lo que se puede hacer despues. */
export function OrderReceipt({ order, name, onRepeat, className }: OrderReceiptProps) {
  const [copied, setCopied] = useState(false)
  const tokens = signedTokens(order)
  const rejected = order.status === 'REJECTED'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(receiptText(order, name))
      setCopied(true)
      toast.success('Comprobante copiado')
    } catch {
      toast.error('No pudimos copiar el comprobante')
    }
  }

  return (
    <aside aria-labelledby="orden-comprobante" className={cn('rounded-2xl border bg-card', className)}>
      <div className="border-b border-dashed px-5 pt-4 pb-3.5">
        <div className="flex items-center justify-between gap-2.5">
          <p className="text-xs tracking-wider text-muted-foreground uppercase">Comprobante</p>
          <span className="font-mono text-xs text-muted-foreground">N.º {String(order.id).padStart(6, '0')}</span>
        </div>
        <h2 id="orden-comprobante" className="mt-2 text-lg font-semibold">
          {order.side === 'BUY' ? 'Compra' : 'Venta'} de {order.symbol}
        </h2>
        {name && <p className="truncate text-[12.5px] text-muted-foreground">{name}</p>}
        <p className="mt-3 flex items-baseline justify-between gap-2.5">
          <span className={cn('font-mono text-[1.6rem] font-medium tabular-nums', tokens === null ? 'text-muted-foreground' : tokens > 0 && 'text-gain')}>
            {tokens === null ? 'Sin mover fichas' : formatSignedTokens(tokens)}
          </span>
          <OrderStatusPill status={order.status} />
        </p>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-2 border-b border-dashed px-5 py-3.5 text-[13px]">
        {receiptLines(order).map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-muted-foreground">{key}</dt>
            <dd className="text-right font-mono text-[12.5px] tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-2 px-5 pt-3.5 pb-4">
        {rejected && (
          <div className="rounded-xl border border-warning/60 bg-warning/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed">
            <p className="font-semibold">Por qué no se ejecutó</p>
            <p className="mt-0.5">{order.rejectionReason ?? 'El backend no indicó el motivo.'}</p>
            <p className="mt-1.5 text-muted-foreground">{rejectionTip(order)}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => onRepeat(order)}>
            {rejected ? 'Intentar de nuevo' : 'Repetir orden'}
          </Button>
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <Link to={`/portafolio/mercado/${order.assetId}`}>Ver activo</Link>
          </Button>
        </div>
        <Button size="sm" variant="outline" className="w-full" onClick={() => void copy()}>
          {copied ? 'Copiado' : 'Copiar comprobante'}
        </Button>
      </div>
    </aside>
  )
}
