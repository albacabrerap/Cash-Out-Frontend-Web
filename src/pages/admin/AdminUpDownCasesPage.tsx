import { useState } from 'react'
import { ArrowUpDown, Eye, EyeOff, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { formatChange, formatDate, formatServerDate } from '@/lib/format'
import { choiceMeta } from '@/lib/updown'
import { caseBalance, ROUNDS_PER_GAME } from '@/lib/updownCases'
import { updownCaseService } from '@/services/updownCaseService'
import type { UpDownCase } from '@/types/updownCases'
import { UpDownCaseDialog } from '@/components/admin/UpDownCaseDialog'
import { DataTable, type Column } from '@/components/data/DataTable'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export default function AdminUpDownCasesPage() {
  const query = useApiQuery(['admin-updown-cases'], (signal) => updownCaseService.list(signal))
  const [editing, setEditing] = useState<UpDownCase | 'new' | null>(null)
  const [deleting, setDeleting] = useState<UpDownCase | null>(null)

  const toggle = useAsyncAction(async (item: UpDownCase) => {
    try {
      const { symbol, cutoff, sector, name, context, lesson } = item
      await updownCaseService.update(item.id, { symbol, cutoff, sector, name, context, lesson, active: !item.active })
      toast.success(item.active ? `${item.symbol} ya no sale en las partidas` : `${item.symbol} vuelve a salir en las partidas`)
      query.reload()
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
    }
  })

  const remove = useAsyncAction(async (item: UpDownCase) => {
    try {
      await updownCaseService.remove(item.id)
      toast.success(`Caso de ${item.symbol} eliminado`)
      setDeleting(null)
      query.reload()
    } catch (err) {
      setDeleting(null)
      toast.error(userMessage(toApiError(err)))
    }
  })

  const balance = query.data && caseBalance(query.data)

  const columns: Column<UpDownCase>[] = [
    {
      id: 'case',
      header: 'Caso',
      className: 'w-full max-w-0',
      cell: (item) => (
        <div className="min-w-0">
          <p className="truncate">
            <span className="font-mono font-medium">{item.symbol}</span>
            <span className="text-muted-foreground"> · {formatDate(item.cutoff)} · {item.sector}</span>
          </p>
          <p className="truncate text-sm text-muted-foreground">{item.context}</p>
        </div>
      ),
    },
    {
      id: 'outcome',
      header: 'Mes siguiente',
      className: 'text-right',
      cell: (item) => {
        if (!item.outcome || item.changePercent === null) return <span className="text-muted-foreground">—</span>
        const meta = choiceMeta(item.outcome)
        return (
          <span className={cn('font-mono whitespace-nowrap tabular-nums', meta.tone)}>
            {meta.icon} {formatChange(item.changePercent)}
          </span>
        )
      },
    },
    {
      id: 'played',
      header: 'Salió',
      className: 'hidden text-right md:table-cell',
      cell: (item) => (
        <span className="whitespace-nowrap">
          {item.timesPlayed === 0 ? (
            <span className="text-muted-foreground">Nunca</span>
          ) : (
            <>
              {item.timesPlayed} {item.timesPlayed === 1 ? 'vez' : 'veces'}
              <span className="block text-xs text-muted-foreground">última: {formatServerDate(item.lastPlayedAt)}</span>
            </>
          )}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      cell: (item) => <Badge variant={item.active ? 'default' : 'outline'}>{item.active ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      id: 'actions',
      header: <span className="sr-only">Acciones</span>,
      className: 'w-0',
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Acciones del caso ${item.symbol} del ${item.cutoff}`}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing(item)}>
              <Pencil aria-hidden="true" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void toggle.run(item)}>
              {item.active ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              {item.active ? 'Desactivar' : 'Activar'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(item)}>
              <Trash2 aria-hidden="true" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="¿Sube o baja?"
        description="El banco de casos del juego. Cada partida toma 8 activos, empezando por los que hace más tiempo no salen."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden="true" />
            Agregar caso
          </Button>
        }
      />

      {balance && balance.active > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm" aria-label="Casos activos por resultado">
          <span className="rounded-full border bg-card px-3 py-1">
            <strong>{balance.active}</strong> activos
          </span>
          {(['UP', 'FLAT', 'DOWN'] as const).map((outcome) => {
            const meta = choiceMeta(outcome)
            return (
              <span key={outcome} className="rounded-full border bg-card px-3 py-1">
                <span className={meta.tone}>{meta.icon}</span> {balance[outcome]} {meta.label.toLowerCase()}
              </span>
            )
          })}
          {balance.active < ROUNDS_PER_GAME && (
            <span className="text-muted-foreground">
              Con menos de {ROUNDS_PER_GAME} activos las partidas tienen menos rondas.
            </span>
          )}
        </div>
      )}

      {query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={query.reload} title="No pudimos cargar los casos" />
      ) : query.data?.length === 0 ? (
        <EmptyState
          icon={ArrowUpDown}
          title="Todavía no hay casos"
          description="Sin casos activos no se puede abrir una sala. Agrega el primero: un activo, el día de una noticia y su lección."
        />
      ) : (
        <DataTable
          caption="Banco de casos de ¿Sube o baja?, activos e inactivos"
          columns={columns}
          rows={query.data}
          rowKey={(item) => item.id}
          loading={!query.data}
          refreshing={query.isRefreshing || toggle.isPending}
          skeletonRows={4}
        />
      )}

      <UpDownCaseDialog
        target={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => {
          setEditing(null)
          query.reload()
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar este caso?"
        description={
          deleting &&
          `El caso de ${deleting.symbol} del ${formatDate(deleting.cutoff)} se borra del banco. Las salas abiertas lo siguen mostrando hasta terminar. Si solo quieres que deje de salir, desactívalo.`
        }
        confirmLabel="Eliminar"
        pendingLabel="Eliminando…"
        onConfirm={() => deleting && void remove.run(deleting)}
        pending={remove.isPending}
      />
    </>
  )
}
