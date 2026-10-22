import { Link, type To } from 'react-router'
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RowActionsProps {
  /** Para lectores de pantalla, p. ej. "Acciones del gasto Almuerzo". */
  label: string
  viewTo: To
  viewState?: unknown
  onEdit: () => void
  onDelete: () => void
}

export function RowActions({ label, viewTo, viewState, onEdit, onDelete }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={viewTo} state={viewState}>
            <Eye aria-hidden="true" />
            Ver detalle
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil aria-hidden="true" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 aria-hidden="true" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
