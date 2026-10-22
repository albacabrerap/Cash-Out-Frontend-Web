import { CloudOff, RefreshCw, ServerCrash, ShieldAlert, TriangleAlert } from 'lucide-react'
import { userMessage, type ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  error: ApiError
  onRetry?: () => void
  title?: string
  className?: string
}

function ErrorIcon({ error }: { error: ApiError }) {
  const className = 'size-8 text-destructive'
  if (error.kind === 'network' || error.kind === 'timeout') return <CloudOff className={className} aria-hidden="true" />
  if (error.status === 403) return <ShieldAlert className={className} aria-hidden="true" />
  if (error.status !== undefined && error.status >= 500) return <ServerCrash className={className} aria-hidden="true" />
  return <TriangleAlert className={className} aria-hidden="true" />
}

/** "Reintentar" solo aparece si puede funcionar (sin red, timeout o 5xx). */
export function ErrorState({ error, onRetry, title = 'No pudimos cargar esto', className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center',
        className,
      )}
    >
      <ErrorIcon error={error} />
      <div className="space-y-1">
        <h3 className="font-medium">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{userMessage(error)}</p>
      </div>
      {onRetry && error.retryable && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Reintentar
        </Button>
      )}
    </div>
  )
}
