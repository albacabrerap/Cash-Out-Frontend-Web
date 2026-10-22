import { useId, useState } from 'react'
import { ArrowDownLeft, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { CATEGORY_META } from '@/lib/categories'
import { formatDateTime, formatSoles } from '@/lib/format'
import { incomeDeleteErrorMessage } from '@/lib/movementErrors'
import { formatLongDate } from '@/lib/movements'
import { cn } from '@/lib/utils'
import { expenseService } from '@/services/expenseService'
import { incomeService } from '@/services/incomeService'
import type { Expense, Income, Movement } from '@/types/movements'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export type MovementRecord = { kind: 'INCOME'; income: Income } | { kind: 'EXPENSE'; expense: Expense }

interface MovementDetailPanelProps {
  movement: Movement
  /** Cambia cuando algo se guardo o se borro: el detalle se vuelve a pedir. */
  version: number
  insight?: string
  onEdit: (record: MovementRecord) => void
  onDeleted: () => void
}

/** El movimiento elegido en la lista, con lo que no entra en una fila y sus acciones. */
export function MovementDetailPanel({ movement, version, insight, onEdit, onDeleted }: MovementDetailPanelProps) {
  const income = movement.kind === 'INCOME'
  const noun = income ? 'ingreso' : 'gasto'
  const [confirming, setConfirming] = useState(false)
  const confirmTitle = useId()

  // La fila no trae la descripcion de los ingresos, y editar necesita el registro completo.
  const record = useApiQuery(['movement-detail', movement.kind, movement.id, version], async (signal): Promise<MovementRecord> =>
    income
      ? { kind: 'INCOME', income: await incomeService.get(movement.id, signal) }
      : { kind: 'EXPENSE', expense: await expenseService.get(movement.id, signal) },
  )

  const remove = useAsyncAction(async () => {
    try {
      if (income) await incomeService.remove(movement.id)
      else await expenseService.remove(movement.id)
      toast.success(income ? 'Ingreso eliminado' : 'Gasto eliminado')
      onDeleted()
    } catch (err) {
      setConfirming(false)
      toast.error(income ? incomeDeleteErrorMessage(err) : userMessage(toApiError(err)))
    }
  })

  const category = movement.category ? CATEGORY_META[movement.category] : undefined
  const description = record.data?.kind === 'INCOME' ? record.data.income.description : undefined

  return (
    <aside aria-labelledby="movimiento-detalle" className="rounded-2xl border bg-card p-5 lg:sticky lg:top-20 lg:p-6">
      <p className="text-xs tracking-wider text-muted-foreground uppercase">Detalle</p>
      <h2 id="movimiento-detalle" className="mt-2.5 text-lg font-semibold break-words">
        {movement.label || 'Sin descripción'}
      </h2>
      <p className={cn('mt-2 text-3xl font-medium tracking-tight tabular-nums', income ? 'text-income' : 'text-expense')}>
        {income ? '+' : '−'}
        {formatSoles(movement.amount)}
      </p>

      <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
        <dt className="text-muted-foreground">Tipo</dt>
        <dd className="flex items-center gap-1.5">
          {income && <ArrowDownLeft className="size-3.5 text-income" aria-hidden="true" />}
          {income ? 'Ingreso' : 'Gasto'}
        </dd>
        {category && (
          <>
            <dt className="text-muted-foreground">Categoría</dt>
            <dd className="flex items-center gap-1.5">
              <category.icon className="size-3.5" style={{ color: category.color }} aria-hidden="true" />
              {category.label}
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">Fecha</dt>
        <dd className="first-letter:uppercase">{formatLongDate(movement.date)}</dd>
        <dt className="text-muted-foreground">Registrado</dt>
        <dd>{formatDateTime(movement.createdAt)}</dd>
        {income && (
          <>
            <dt className="text-muted-foreground">Descripción</dt>
            <dd className="break-words">
              {record.data ? (
                description || <span className="text-muted-foreground">Sin descripción</span>
              ) : (
                <Skeleton className="h-4 w-32" />
              )}
            </dd>
          </>
        )}
      </dl>

      {insight && <p className="mt-4 rounded-xl bg-accent px-3.5 py-3 text-[13px] leading-relaxed">{insight}</p>}

      {confirming ? (
        <div role="group" aria-labelledby={confirmTitle} className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5">
          <p id={confirmTitle} className="text-sm font-semibold">
            ¿Eliminar este {noun}?
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {income ? 'Ese monto se descontará de tu ahorro.' : 'Ese monto volverá a tu saldo disponible.'} No se puede deshacer.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" autoFocus onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" disabled={remove.isPending} onClick={() => remove.run()}>
              Eliminar {noun}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={!record.data}
            onClick={() => record.data && onEdit(record.data)}
          >
            <Pencil aria-hidden="true" />
            Editar
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-destructive" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden="true" />
            Eliminar
          </Button>
        </div>
      )}
    </aside>
  )
}
