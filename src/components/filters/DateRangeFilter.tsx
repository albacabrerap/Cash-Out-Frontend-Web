import { useId, useState } from 'react'
import { isIsoDate, todayIso } from '@/lib/dates'
import { Input } from '@/components/ui/input'

interface DateRangeFilterProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

/**
 * El backend exige las dos fechas o ninguna, y "desde" no posterior a "hasta".
 * Mientras el rango este incompleto o al reves no se aplica, y se explica por que.
 */
export function DateRangeFilter({ from: initialFrom, to: initialTo, onChange }: DateRangeFilterProps) {
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [external, setExternal] = useState({ from: initialFrom, to: initialTo })
  const hintId = useId()

  if (initialFrom !== external.from || initialTo !== external.to) {
    setExternal({ from: initialFrom, to: initialTo })
    setFrom(initialFrom)
    setTo(initialTo)
  }

  const today = todayIso()

  const problem =
    from && to && from > to
      ? 'La fecha inicial no puede ser posterior a la final.'
      : Boolean(from) !== Boolean(to)
        ? 'Elige las dos fechas para filtrar.'
        : null

  function change(nextFrom: string, nextTo: string) {
    setFrom(nextFrom)
    setTo(nextTo)
    if (!nextFrom && !nextTo) onChange('', '')
    else if (isIsoDate(nextFrom) && isIsoDate(nextTo) && nextFrom <= nextTo) onChange(nextFrom, nextTo)
  }

  return (
    <fieldset className="space-y-1">
      <legend className="sr-only">Rango de fechas</legend>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label="Desde"
          max={today}
          value={from}
          aria-invalid={Boolean(problem) && Boolean(from)}
          aria-describedby={problem ? hintId : undefined}
          onChange={(event) => change(event.target.value, to)}
          className="w-38"
        />
        <span className="text-sm text-muted-foreground" aria-hidden="true">
          –
        </span>
        <Input
          type="date"
          aria-label="Hasta"
          max={today}
          value={to}
          aria-invalid={Boolean(problem) && Boolean(to)}
          aria-describedby={problem ? hintId : undefined}
          onChange={(event) => change(from, event.target.value)}
          className="w-38"
        />
      </div>
      {problem && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {problem}
        </p>
      )}
    </fieldset>
  )
}
