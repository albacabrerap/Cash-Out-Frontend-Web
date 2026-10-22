import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Pencil, SearchX, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { formatDate, formatDateTime, formatSoles } from '@/lib/format'
import { parseId, returnPath } from '@/lib/routeParams'
import { expenseService } from '@/services/expenseService'
import type { Expense } from '@/types/movements'
import { AmountText } from '@/components/data/AmountText'
import { CategoryBadge } from '@/components/data/CategoryBadge'
import { DetailItem, DetailList } from '@/components/data/DetailList'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageLoader } from '@/components/feedback/PageLoader'
import { PageHeader } from '@/components/layout/PageHeader'
import { ExpenseFormDialog } from '@/components/movements/ExpenseFormDialog'
import { BackLink } from '@/components/navigation/BackLink'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function ExpenseDetailPage() {
  const id = parseId(useParams().id)
  const location = useLocation()
  const navigate = useNavigate()
  const backTo = returnPath(location.state, '/movimientos/gastos')
  const backLabel = backTo.startsWith('/movimientos/todos') ? 'Volver a movimientos' : 'Volver a gastos'
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const query = useApiQuery(['expense', id], (signal) =>
    id ? expenseService.get(id, signal) : Promise.reject(new ApiError({ kind: 'http', status: 404 })),
  )

  const remove = useAsyncAction(async (expense: Expense) => {
    try {
      await expenseService.remove(expense.id)
      toast.success('Gasto eliminado')
      navigate(backTo, { replace: true })
    } catch (err) {
      setConfirming(false)
      toast.error(userMessage(toApiError(err)))
    }
  })

  if (query.error?.status === 404) {
    return (
      <EmptyState
        icon={SearchX}
        title="No encontramos este gasto"
        description="Puede que ya lo hayas eliminado o que el enlace no sea correcto."
        action={
          <Button asChild variant="outline">
            <Link to={backTo}>{backLabel}</Link>
          </Button>
        }
      />
    )
  }
  if (query.error && !query.data) {
    return <ErrorState error={query.error} onRetry={query.reload} title="No pudimos cargar el gasto" />
  }
  if (!query.data) return <PageLoader label="Cargando el gasto…" />

  const expense = query.data

  return (
    <>
      <BackLink to={backTo}>{backLabel}</BackLink>
      <PageHeader
        title={expense.description || 'Gasto sin descripción'}
        description={`Gasto del ${formatDate(expense.date)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" />
              Editar
            </Button>
            <Button variant="destructive" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden="true" />
              Eliminar
            </Button>
          </>
        }
      />
      <Card>
        <CardContent>
          <DetailList>
            <DetailItem label="Monto">
              <AmountText value={expense.amount} kind="expense" className="text-2xl" />
            </DetailItem>
            <DetailItem label="Categoría">
              <CategoryBadge category={expense.category} />
            </DetailItem>
            <DetailItem label="Fecha del gasto">{formatDate(expense.date)}</DetailItem>
            <DetailItem label="Registrado el">{formatDateTime(expense.createdAt)}</DetailItem>
            <DetailItem label="Descripción" className="sm:col-span-2">
              {expense.description || <span className="font-normal text-muted-foreground">Sin descripción</span>}
            </DetailItem>
          </DetailList>
        </CardContent>
      </Card>

      <ExpenseFormDialog
        open={editing}
        onOpenChange={setEditing}
        expense={expense}
        onSaved={() => {
          setEditing(false)
          query.reload()
        }}
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Eliminar este gasto?"
        description={
          <>
            Se eliminará el gasto de <strong>{formatSoles(expense.amount)}</strong> y ese monto volverá a tu saldo
            disponible. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar gasto"
        onConfirm={() => remove.run(expense)}
        pending={remove.isPending}
      />
    </>
  )
}
