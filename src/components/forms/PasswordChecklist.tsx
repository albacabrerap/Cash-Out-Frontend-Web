import { Check, Circle } from 'lucide-react'
import { passwordRules } from '@/lib/validation'
import { cn } from '@/lib/utils'

export function PasswordChecklist({ value, id }: { value: string; id?: string }) {
  return (
    <ul id={id} className="grid gap-1 text-xs sm:grid-cols-2" aria-label="Requisitos de la contraseña">
      {passwordRules.map((rule) => {
        const ok = rule.test(value)
        return (
          <li
            key={rule.id}
            className={cn('flex items-center gap-1.5 transition-colors', ok ? 'text-success' : 'text-muted-foreground')}
          >
            {ok ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}
            <span>{rule.label}</span>
            <span className="sr-only">{ok ? ' — cumplido' : ' — pendiente'}</span>
          </li>
        )
      })}
    </ul>
  )
}
