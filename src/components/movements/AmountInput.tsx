import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Campo de monto en soles. Es de texto (no number) para aceptar coma decimal y no cambiar con la rueda del mouse. */
export function AmountInput({ className, ...props }: Omit<ComponentProps<typeof Input>, 'type'>) {
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground"
        aria-hidden="true"
      >
        S/
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        className={cn('pl-8 tabular-nums', className)}
        {...props}
      />
    </div>
  )
}
