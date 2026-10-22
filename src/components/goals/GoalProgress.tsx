import { Progress } from '@/components/ui/progress'
import { formatPercent } from '@/lib/goals'
import { cn } from '@/lib/utils'
import type { GoalStatus } from '@/types/goals'

export function GoalProgress({
  percent,
  status,
  label,
  className,
}: {
  percent: number
  status: GoalStatus
  /** Para lectores de pantalla, p. ej. "Avance de Laptop". */
  label: string
  className?: string
}) {
  const value = Math.min(100, Math.max(0, percent))
  return (
    <Progress
      value={value}
      aria-label={label}
      aria-valuetext={formatPercent(value)}
      className={cn(
        'h-2',
        status === 'EXPIRED'
          ? '[&>[data-slot=progress-indicator]]:bg-muted-foreground'
          : '[&>[data-slot=progress-indicator]]:bg-signal-up',
        className,
      )}
    />
  )
}
