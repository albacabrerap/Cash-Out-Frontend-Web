import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  id: string
  title: string
  description: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/** Un bloque de ajustes: encabezado, una tarjeta con filas y, si hace falta, un pie con las acciones. */
export function SettingsSection({ id, title, description, children, footer, className }: SettingsSectionProps) {
  return (
    <section aria-labelledby={id} className={cn('rounded-2xl border bg-muted/40 p-1.5', className)}>
      <header className="px-3.5 pt-2.5 pb-3">
        <h2 id={id} className="font-medium">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="divide-y rounded-xl border bg-card">{children}</div>
      {footer && <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 pt-3 pb-2">{footer}</div>}
    </section>
  )
}

interface SettingsRowProps {
  label: string
  description: ReactNode
  /** El id del control, para que la etiqueta sea un label de verdad. */
  htmlFor?: string
  changed?: boolean
  children: ReactNode
  className?: string
}

/** Etiqueta y descripcion a la izquierda, el control a la derecha; en pantallas chicas, uno debajo del otro. */
export function SettingsRow({ label, description, htmlFor, changed, children, className }: SettingsRowProps) {
  const Label = htmlFor ? 'label' : 'p'
  return (
    <div className={cn('grid gap-3 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6', className)}>
      <div>
        <div className="flex items-center gap-2">
          <Label htmlFor={htmlFor} className="text-sm font-medium">
            {label}
          </Label>
          {changed && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-normal">
              Cambiado
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0 space-y-2">{children}</div>
    </div>
  )
}

export function SettingsError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
      <CircleAlert className="size-4 flex-none" aria-hidden="true" />
      {message}
    </p>
  )
}
