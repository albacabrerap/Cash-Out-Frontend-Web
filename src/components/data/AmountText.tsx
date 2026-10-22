import { formatSoles } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Ingresos con "+" en verde y gastos con "−" en rojo. */
export function AmountText({
  value,
  kind,
  className,
}: {
  value: number
  kind: 'income' | 'expense'
  className?: string
}) {
  return (
    <span
      className={cn('font-medium whitespace-nowrap tabular-nums', kind === 'income' ? 'text-income' : 'text-expense', className)}
    >
      {kind === 'income' ? '+' : '−'}
      {formatSoles(value)}
    </span>
  )
}
