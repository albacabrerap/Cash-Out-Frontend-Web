import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

interface GoalTargetProps {
  goalId: number
  /** En pantalla ancha elige la meta del panel; en el celular abre su pagina. */
  wide: boolean
  selected: boolean
  onSelect: (goalId: number) => void
  className?: string
  children: ReactNode
}

export function GoalTarget({ goalId, wide, selected, onSelect, className, children }: GoalTargetProps) {
  const classes = cn('outline-none focus-visible:ring-2 focus-visible:ring-ring', className)
  if (wide) {
    return (
      <button type="button" aria-pressed={selected} onClick={() => onSelect(goalId)} className={cn('text-left', classes)}>
        {children}
      </button>
    )
  }
  return (
    <Link to={`/metas/${goalId}`} className={classes}>
      {children}
    </Link>
  )
}
