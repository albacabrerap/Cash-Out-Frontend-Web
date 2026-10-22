import { CATEGORY_META } from '@/lib/categories'
import type { ExpenseCategory } from '@/types/movements'
import { Badge } from '@/components/ui/badge'

/** El color de la categoria va en el icono; el texto se queda en el color de lectura. */
export function CategoryBadge({ category }: { category: ExpenseCategory }) {
  const { label, icon: Icon, color } = CATEGORY_META[category]
  return (
    <Badge variant="outline">
      <Icon aria-hidden="true" style={{ color }} />
      {label}
    </Badge>
  )
}
