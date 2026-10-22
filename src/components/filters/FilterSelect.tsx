import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  /** Si se pasa, agrega una opcion "todas" que equivale a no filtrar (valor ''). */
  allLabel?: string
  className?: string
}

// Radix no admite '' como valor de una opcion.
const ALL = '__all__'

export function FilterSelect({ label, value, options, onChange, allLabel, className }: FilterSelectProps) {
  return (
    <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? '' : next)}>
      <SelectTrigger aria-label={label} className={cn('w-full sm:w-auto sm:min-w-40', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
