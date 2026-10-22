import { Check, Minus } from 'lucide-react'
import { PASSWORD_MIN, passwordRules } from '@/lib/validation'
import { cn } from '@/lib/utils'

function strengthOf(value: string, met: number) {
  if (!value) return { label: '', tone: 'text-muted-foreground' }
  if (value.length < PASSWORD_MIN) return { label: 'Muy corta', tone: 'text-destructive' }
  if (met <= 2) return { label: 'Débil', tone: 'text-destructive' }
  if (met === 3) return { label: 'Regular', tone: 'text-muted-foreground' }
  if (met === 4) return { label: 'Buena', tone: 'text-foreground' }
  return { label: 'Fuerte', tone: 'text-success' }
}

/** Barra de fuerza y requisitos; cada segmento es una de las reglas del backend. */
export function PasswordStrength({ value, id }: { value: string; id?: string }) {
  const rules = passwordRules.map((rule) => ({ id: rule.id, label: rule.label, ok: rule.test(value) }))
  const met = rules.filter((rule) => rule.ok).length
  const strength = strengthOf(value, met)

  return (
    <div id={id} className="space-y-2.5">
      <div className="flex items-center gap-3">
        <div aria-hidden="true" className="grid flex-1 grid-cols-5 gap-1.5">
          {rules.map((rule, i) => (
            <span
              key={rule.id}
              className={cn(
                'h-1 rounded-full transition-colors',
                i >= met ? 'bg-foreground/15' : met === rules.length ? 'bg-success' : 'bg-foreground',
              )}
            />
          ))}
        </div>
        <span aria-live="polite" className={cn('min-w-16 text-right text-xs font-medium', strength.tone)}>
          {strength.label && <span className="sr-only">Seguridad de la contraseña: </span>}
          {strength.label}
        </span>
      </div>
      <ul className="grid gap-1.5 text-xs sm:grid-cols-2" aria-label="Requisitos de la contraseña">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-1.5 transition-colors',
              rule.ok ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {rule.ok ? <Check className="size-3.5" aria-hidden="true" /> : <Minus className="size-3.5" aria-hidden="true" />}
            <span>{rule.label}</span>
            <span className="sr-only">{rule.ok ? ' — cumplido' : ' — pendiente'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
