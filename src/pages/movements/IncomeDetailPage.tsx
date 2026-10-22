import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Pencil, SearchX, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { formatDate, formatDateTime, formatSoles } from '@/lib/format'
import { incomeDeleteErrorMessage } from '@/lib/movementErrors'
import { parseId, returnPath } from '@/lib/routeParams'
import { incomeService } from '@/services/incomeService'
import type { Income } from '@/types/movements'
import { AmountText } from '@/components/data/AmountText'
import { DetailItem, DetailList } from '@/components/data/DetailList'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageLoader } from '@/components/feedback/PageLoader'
import { PageHeader } from '@/components/layout/PageHeader'
import { IncomeFormDialog } from '@/components/movements/IncomeFormDialog'
import { BackLink } from '@/components/navigation/BackLink'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function IncomeDetailPage() {
  const id = parseId(useParams().id)
  const location = useLocation()
  const navigate = useNavigate()
  const backTo = returnPath(location.state, '/movimientos/ingresos')
  const backLabel = backTo.startsWith('/movimientos/todos') ? 'Volver a movimientos' : 'Volver a ingresos'
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const query = useApiQuery(['income', id], (signal) =>
    id ? incomeService.get(id, signal) : Promise.reject(new ApiError({ kind: 'http', status: 404 })),
  )

  const remove = useAsyncAction(async (income: Income) => {
    try {
      await incomeService.remove(income.id)
      toast.success('Ingreso eliminado')
      navigate(backTo, { replace: true })
    } catch (err) {
      setConfirming(false)
      toast.error(incomeDeleteErrorMessage(err))
    }
  })

  if (query.error?.status === 404) {
    return (
      <EmptyState
        icon={SearchX}
        title="No encontramos este ingreso"
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
    return <ErrorState error={query.error} onRetry={query.reload} title="No pudimos cargar el ingreso" />
  }
  if (!query.data) return <PageLoader label="Cargando el ingreso…" />

  const income = query.data

  return (
    <>
      <BackLink to={backTo}>{backLabel}</BackLink>
      <PageHeader
        title={income.source}
        description={`Ingreso del ${formatDate(income.date)}`}
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
              <AmountText value={income.amount} kind="income" className="text-2xl" />
            </DetailItem>
            <DetailItem label="Origen">{income.source}</DetailItem>
            <DetailItem label="Fecha del ingreso">{formatDate(income.date)}</DetailItem>
            <DetailItem label="Registrado el">{formatDateTime(income.createdAt)}</DetailItem>
            <DetailItem label="Descripción" className="sm:col-span-2">
              {income.description || <span className="font-normal text-muted-foreground">Sin descripción</span>}
            </DetailItem>
          </DetailList>
        </CardContent>
      </Card>

      <IncomeFormDialog
        open={editing}
        onOpenChange={setEditing}
        income={income}
        onSaved={() => {
          setEditing(false)
          query.reload()
        }}
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Eliminar este ingreso?"
        description={
          <>
            Se eliminará el ingreso de <strong>{formatSoles(income.amount)}</strong> y ese monto se descontará de tu
            ahorro. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar ingreso"
        onConfirm={() => remove.run(income)}
        pending={remove.isPending}
      />
    </>
  )
}
