import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CircleCheck, HandCoins, Pencil, SearchX, TimerOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useFlagParam } from '@/hooks/useCreateParam'
import { formatDate, formatDateTime, formatServerDate, formatSoles } from '@/lib/format'
import { CONTRIBUTION_SOURCE_LABEL, formatPercent, GOAL_STATUS_LABEL, goalTimeText, remainingAmount } from '@/lib/goals'
import { parseId } from '@/lib/routeParams'
import { goalService } from '@/services/goalService'
import type { Contribution, SavingsGoal } from '@/types/goals'
import { DataTable, type Column } from '@/components/data/DataTable'
import { DetailItem, DetailList } from '@/components/data/DetailList'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageLoader } from '@/components/feedback/PageLoader'
import { ContributionDialog } from '@/components/goals/ContributionDialog'
import { DeleteGoalDescription } from '@/components/goals/DeleteGoalDescription'
import { GoalFormDialog } from '@/components/goals/GoalFormDialog'
import { GoalProgress } from '@/components/goals/GoalProgress'
import { GoalStatusBadge } from '@/components/goals/GoalStatusBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { BackLink } from '@/components/navigation/BackLink'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CONTRIBUTION_COLUMNS: Column<Contribution>[] = [
  {
    id: 'date',
    header: 'Fecha',
    cell: (contribution) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(contribution.createdAt)}</span>,
  },
  {
    id: 'source',
    header: 'Origen',
    className: 'w-full',
    cell: (contribution) => CONTRIBUTION_SOURCE_LABEL[contribution.source],
  },
  {
    id: 'amount',
    header: 'Monto',
    className: 'text-right',
    cell: (contribution) => <span className="font-medium whitespace-nowrap tabular-nums">{formatSoles(contribution.amount)}</span>,
  },
]

export default function GoalDetailPage() {
  const id = parseId(useParams().id)
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [contributing, setContributing] = useFlagParam('aportar')
  const [confirming, setConfirming] = useState(false)

  const notFound = () => Promise.reject(new ApiError({ kind: 'http', status: 404 }))
  const goal = useApiQuery(['goal', id], (signal) => (id ? goalService.get(id, signal) : notFound()))
  const contributions = useApiQuery(['goal-contributions', id], (signal) =>
    id ? goalService.contributions(id, signal) : notFound(),
  )

  const remove = useAsyncAction(async (target: SavingsGoal) => {
    try {
      await goalService.remove(target.id)
      toast.success('Meta eliminada')
      navigate('/metas', { replace: true })
    } catch (err) {
      setConfirming(false)
      toast.error(userMessage(toApiError(err)))
    }
  })

  if (goal.error?.status === 404) {
    return (
      <EmptyState
        icon={SearchX}
        title="No encontramos esta meta"
        description="Puede que ya la hayas eliminado o que el enlace no sea correcto."
        action={
          <Button asChild variant="outline">
            <Link to="/metas">Volver a metas</Link>
          </Button>
        }
      />
    )
  }
  if (goal.error && !goal.data) {
    return <ErrorState error={goal.error} onRetry={goal.reload} title="No pudimos cargar la meta" />
  }
  if (!goal.data) return <PageLoader label="Cargando la meta…" />

  const data = goal.data
  const inProgress = data.status === 'IN_PROGRESS'

  return (
    <>
      <BackLink to="/metas">Volver a metas</BackLink>
      <PageHeader
        title={data.name}
        description={`Meta ${GOAL_STATUS_LABEL[data.status].toLowerCase()} · fecha límite ${formatDate(data.deadline)}`}
        actions={
          <>
            {inProgress && (
              <>
                <Button onClick={() => setContributing(true)}>
                  <HandCoins aria-hidden="true" />
                  Aportar
                </Button>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil aria-hidden="true" />
                  Editar
                </Button>
              </>
            )}
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden="true" />
              Eliminar
            </Button>
          </>
        }
      />

      {data.status === 'COMPLETED' && (
        <Alert className="border-success/40">
          <CircleCheck aria-hidden="true" className="text-success" />
          <AlertTitle>¡Cumpliste esta meta el {formatServerDate(data.completedAt)}!</AlertTitle>
          <AlertDescription>
            Lo que reuniste ya no está reservado: vuelve a tu saldo disponible para que lo uses en tu objetivo.
          </AlertDescription>
        </Alert>
      )}
      {data.status === 'EXPIRED' && (
        <Alert>
          <TimerOff aria-hidden="true" />
          <AlertTitle>Esta meta venció el {formatDate(data.deadline)} sin cumplirse</AlertTitle>
          <AlertDescription>
            Lo que aportaste ({formatSoles(data.accumulatedAmount)}) ya volvió a tu saldo disponible. Ya no se puede aportar
            ni editar; si quieres seguir, crea una meta nueva.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Llevas</p>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatSoles(data.accumulatedAmount)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tabular-nums">{formatPercent(data.progressPercent)}</span>
              <GoalStatusBadge status={data.status} />
            </div>
          </div>
          <GoalProgress percent={data.progressPercent} status={data.status} label={`Avance de ${data.name}`} />
          <DetailList className="lg:grid-cols-4">
            <DetailItem label="Objetivo">{formatSoles(data.targetAmount)}</DetailItem>
            <DetailItem label="Te falta">{formatSoles(remainingAmount(data))}</DetailItem>
            <DetailItem label="Fecha límite">{formatDate(data.deadline)}</DetailItem>
            <DetailItem label="Plazo">{goalTimeText(data)}</DetailItem>
          </DetailList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Historial de aportes</h2>
          </CardTitle>
          <CardDescription>Cada aporte queda registrado; no se puede borrar.</CardDescription>
        </CardHeader>
        <CardContent>
          {contributions.error && !contributions.data ? (
            <ErrorState error={contributions.error} onRetry={contributions.reload} title="No pudimos cargar los aportes" />
          ) : contributions.data?.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía no hay aportes.
              {inProgress && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="font-medium text-foreground underline underline-offset-4"
                    onClick={() => setContributing(true)}
                  >
                    Haz el primero
                  </button>
                </>
              )}
            </p>
          ) : (
            <DataTable
              caption={`Aportes a ${data.name}`}
              columns={CONTRIBUTION_COLUMNS}
              rows={contributions.data}
              rowKey={(contribution) => contribution.id}
              loading={contributions.isLoading}
              refreshing={contributions.isRefreshing}
              skeletonRows={3}
              className="border-0"
            />
          )}
        </CardContent>
      </Card>

      <GoalFormDialog
        open={editing}
        onOpenChange={setEditing}
        goal={data}
        onSaved={() => {
          setEditing(false)
          goal.reload()
        }}
      />
      <ContributionDialog
        goal={contributing && inProgress ? data : null}
        onOpenChange={(open) => !open && setContributing(false)}
        onSaved={() => {
          setContributing(false)
          goal.reload()
          contributions.reload()
        }}
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Eliminar esta meta?"
        description={<DeleteGoalDescription goal={data} />}
        confirmLabel="Eliminar meta"
        onConfirm={() => remove.run(data)}
        pending={remove.isPending}
      />
    </>
  )
}
