import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageLoaderProps {
  label?: string
  fullScreen?: boolean
  className?: string
}

export function PageLoader({ label = 'Cargando…', fullScreen = false, className }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-muted-foreground',
        fullScreen ? 'min-h-svh' : 'min-h-64',
        className,
      )}
    >
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
