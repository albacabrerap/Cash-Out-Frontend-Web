import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface Column<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Se aplica a la cabecera y a cada celda, p. ej. "text-right" o "hidden md:table-cell". */
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  /** Para lectores de pantalla. */
  caption: string
  loading?: boolean
  refreshing?: boolean
  skeletonRows?: number
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  refreshing = false,
  skeletonRows = 5,
  className,
}: DataTableProps<T>) {
  return (
    <div
      aria-busy={loading || refreshing}
      className={cn('rounded-lg border transition-opacity', refreshing && 'opacity-60', className)}
    >
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column.id} className={cn('px-4 text-muted-foreground', column.className)}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TableCell key={column.id} className={cn('px-4 py-3', column.className)}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows?.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.id} className={cn('px-4 py-3', column.className)}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  )
}
