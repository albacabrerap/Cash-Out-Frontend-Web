import type { LucideIcon } from 'lucide-react'
import { RefreshCw } from 'lucide-react'
import { userMessage, type ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  icon: LucideIcon
  /** Sin valor ni error, la tarjeta se muestra cargando. */
  value?: string
  hint: string
  error?: ApiError
  onRetry?: () => void
  /** income/expense van con la paleta; gain/loss son el verde y rojo del mercado. */
  tone?: 'default' | 'income' | 'expense' | 'gain' | 'loss'
}

/** Cada tarjeta carga y falla por su cuenta, sin tapar las que si cargaron. */
export function StatCard({ label, icon: Icon, value, hint, error, onRetry, tone = 'default' }: StatCardProps) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>

        {value !== undefined ? (
          <p
            className={cn(
              'text-2xl font-semibold tracking-tight tabular-nums',
              tone === 'income' && 'text-income',
              tone === 'expense' && 'text-expense',
              tone === 'gain' && 'text-gain',
              tone === 'loss' && 'text-loss',
            )}
          >
            {value}
          </p>
        ) : error ? (
          <div role="alert" className="flex items-center justify-between gap-2">
            <p className="text-sm text-destructive">{userMessage(error)}</p>
            {onRetry && error.retryable && (
              <Button variant="ghost" size="icon-sm" onClick={onRetry} aria-label={`Reintentar cargar ${label}`}>
                <RefreshCw aria-hidden="true" />
              </Button>
            )}
          </div>
        ) : (
          <Skeleton className="h-8 w-32" aria-label={`Cargando ${label}`} />
        )}

        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
