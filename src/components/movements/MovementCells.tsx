import { ArrowDownLeft } from 'lucide-react'
import type { Movement } from '@/types/movements'
import { CategoryBadge } from '@/components/data/CategoryBadge'
import { Badge } from '@/components/ui/badge'

/** Un ingreso dice "Ingreso"; un gasto muestra su categoria. */
export function MovementTypeBadge({ movement }: { movement: Movement }) {
  if (movement.kind === 'EXPENSE' && movement.category) return <CategoryBadge category={movement.category} />
  if (movement.kind === 'EXPENSE') return <Badge variant="secondary">Gasto</Badge>
  return (
    <Badge variant="outline" className="border-income/40 text-income">
      <ArrowDownLeft aria-hidden="true" />
      Ingreso
    </Badge>
  )
}
