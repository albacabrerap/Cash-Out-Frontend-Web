import { ORDER_STATUS_LABEL } from '@/lib/market'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/market'

const TONE: Record<OrderStatus, string> = {
  EXECUTED: 'border-gain/60 bg-gain/10 text-gain',
  REJECTED: 'border-warning/60 bg-warning/10 text-warning',
  PENDING: 'text-muted-foreground',
  CANCELLED: 'text-muted-foreground',
}

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('inline-block rounded-full border px-2 py-px text-[11.5px] whitespace-nowrap', TONE[status])}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}
