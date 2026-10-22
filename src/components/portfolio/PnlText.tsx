import { formatSignedPercent, formatSignedTokens } from '@/lib/market'
import { cn } from '@/lib/utils'

interface PnlTextProps {
  value: number | null
  percent?: number | null
  /** El % debajo del monto, para columnas angostas. */
  stacked?: boolean
  className?: string
}

/** Ganancia en verde, perdida en rojo, con el % si se conoce. */
export function PnlText({ value, percent, stacked = false, className }: PnlTextProps) {
  if (value === null) return <span className="text-muted-foreground">—</span>
  return (
    <span
      className={cn(
        'font-medium whitespace-nowrap tabular-nums',
        stacked && 'inline-flex flex-col items-end',
        value > 0 && 'text-gain',
        value < 0 && 'text-loss',
        className,
      )}
    >
      {formatSignedTokens(value)}
      {percent !== undefined && percent !== null && (
        <span className={cn('text-xs font-normal', !stacked && 'ml-1')}>
          {stacked ? formatSignedPercent(percent) : `(${formatSignedPercent(percent)})`}
        </span>
      )}
    </span>
  )
}
