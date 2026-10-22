import { useId } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZES, pageWindow } from '@/lib/listParams'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DataPaginationProps {
  page: number
  size: number
  totalElements: number
  totalPages: number
  hrefForPage: (page: number) => string
  onSizeChange: (size: number) => void
  /** "gasto" / "gastos" */
  noun: { one: string; other: string }
}

const count = new Intl.NumberFormat('es-PE')

export function DataPagination({
  page,
  size,
  totalElements,
  totalPages,
  hrefForPage,
  onSizeChange,
  noun,
}: DataPaginationProps) {
  const sizeLabelId = useId()
  if (totalElements === 0) return null

  const first = (page - 1) * size + 1
  const last = Math.min(page * size, totalElements)

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <p aria-live="polite">
          Mostrando <span className="font-medium text-foreground tabular-nums">{first}–{last}</span> de{' '}
          <span className="font-medium text-foreground tabular-nums">{count.format(totalElements)}</span>{' '}
          {totalElements === 1 ? noun.one : noun.other}
        </p>
        <div className="flex items-center gap-2">
          <span id={sizeLabelId} className="hidden sm:inline">
            Filas
          </span>
          <Select value={String(size)} onValueChange={(value) => onSizeChange(Number(value))}>
            <SelectTrigger size="sm" className="w-18" aria-labelledby={sizeLabelId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Paginación">
          <ul className="flex items-center gap-1">
            <li>
              <PageArrow page={page - 1} disabled={page <= 1} hrefForPage={hrefForPage} direction="prev" />
            </li>
            {pageWindow(page, totalPages).map((item) =>
              typeof item === 'number' ? (
                <li key={item}>
                  <Button asChild variant={item === page ? 'outline' : 'ghost'} size="icon-sm">
                    <Link
                      to={hrefForPage(item)}
                      aria-label={`Página ${item}`}
                      aria-current={item === page ? 'page' : undefined}
                    >
                      {item}
                    </Link>
                  </Button>
                </li>
              ) : (
                <li key={item} aria-hidden="true" className="px-1 text-muted-foreground">
                  …
                </li>
              ),
            )}
            <li>
              <PageArrow page={page + 1} disabled={page >= totalPages} hrefForPage={hrefForPage} direction="next" />
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}

function PageArrow({
  page,
  disabled,
  hrefForPage,
  direction,
}: {
  page: number
  disabled: boolean
  hrefForPage: (page: number) => string
  direction: 'prev' | 'next'
}) {
  const label = direction === 'prev' ? 'Página anterior' : 'Página siguiente'
  const icon = direction === 'prev' ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />

  if (disabled) {
    return (
      <Button variant="ghost" size="icon-sm" disabled aria-label={label}>
        {icon}
      </Button>
    )
  }
  return (
    <Button asChild variant="ghost" size="icon-sm">
      <Link to={hrefForPage(page)} aria-label={label}>
        {icon}
      </Link>
    </Button>
  )
}
