import { useState } from 'react'
import { Archive, ArchiveRestore, Eye, EyeOff, Gamepad2, MoreHorizontal, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { formatTokens } from '@/lib/format'
import { MINIGAME_STATUS_LABEL, MINIGAME_TYPE_LABEL, packFor } from '@/lib/minigames'
import { minigameService } from '@/services/minigameService'
import type { Minigame, MinigameStatus } from '@/types/minigames'
import { DataTable, type Column } from '@/components/data/DataTable'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { MinigameFormDialog } from '@/components/admin/MinigameFormDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { GameThumb } from '@/components/minigames/GameThumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const STATUS_ORDER: Record<MinigameStatus, number> = { PUBLISHED: 0, DRAFT: 1, ARCHIVED: 2 }
const STATUS_VARIANT = { PUBLISHED: 'default', DRAFT: 'secondary', ARCHIVED: 'outline' } as const

export default function AdminMinigamesPage() {
  const query = useApiQuery(['admin-minigames'], (signal) => minigameService.listAll(signal))
  const [editing, setEditing] = useState<Minigame | 'new' | null>(null)
  const [archiving, setArchiving] = useState<Minigame | null>(null)

  const setStatus = useAsyncAction(async (game: Minigame, status: MinigameStatus) => {
    try {
      await minigameService.update(game.id, {
        title: game.title,
        type: game.type,
        topic: game.topic,
        tokenCost: game.tokenCost,
        maxTokenReward: game.maxTokenReward,
        status,
      })
      toast.success(status === 'PUBLISHED' ? `«${game.title}» ya se puede jugar` : `«${game.title}» quedó como borrador`)
      query.reload()
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
    }
  })

  const archive = useAsyncAction(async (game: Minigame) => {
    try {
      await minigameService.archive(game.id)
      toast.success(`«${game.title}» archivado`)
      setArchiving(null)
      query.reload()
    } catch (err) {
      setArchiving(null)
      toast.error(userMessage(toApiError(err)))
    }
  })

  const rows = query.data && [...query.data].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.id - b.id)

  const columns: Column<Minigame>[] = [
    {
      id: 'game',
      header: 'Juego',
      className: 'w-full max-w-0',
      cell: (game) => {
        const playable = packFor(game) !== null
        return (
          <div className="flex items-center gap-3">
            <GameThumb id={game.id} title={game.title} className="size-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate font-medium">{game.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {MINIGAME_TYPE_LABEL[game.type]} · {game.topic ?? 'sin tema'}
                {!playable && ' · sin contenido en la web'}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'cost',
      header: 'Costo',
      className: 'hidden text-right sm:table-cell',
      cell: (game) => (
        <span className="whitespace-nowrap tabular-nums">{game.tokenCost === 0 ? 'Gratis' : formatTokens(game.tokenCost)}</span>
      ),
    },
    {
      id: 'reward',
      header: 'Premio',
      className: 'hidden text-right sm:table-cell',
      cell: (game) => <span className="whitespace-nowrap tabular-nums">{formatTokens(game.maxTokenReward)}</span>,
    },
    {
      id: 'status',
      header: 'Estado',
      cell: (game) => <Badge variant={STATUS_VARIANT[game.status]}>{MINIGAME_STATUS_LABEL[game.status]}</Badge>,
    },
    {
      id: 'actions',
      header: <span className="sr-only">Acciones</span>,
      className: 'w-0',
      cell: (game) => {
        const playable = packFor(game) !== null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${game.title}`}>
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(game)}>
                <Pencil aria-hidden="true" />
                Editar
              </DropdownMenuItem>
              {game.status === 'DRAFT' && (
                <DropdownMenuItem disabled={!playable} onSelect={() => void setStatus.run(game, 'PUBLISHED')}>
                  <Eye aria-hidden="true" />
                  {playable ? 'Publicar' : 'Publicar (falta contenido)'}
                </DropdownMenuItem>
              )}
              {game.status === 'PUBLISHED' && (
                <DropdownMenuItem onSelect={() => void setStatus.run(game, 'DRAFT')}>
                  <EyeOff aria-hidden="true" />
                  Pasar a borrador
                </DropdownMenuItem>
              )}
              {game.status === 'ARCHIVED' ? (
                <DropdownMenuItem onSelect={() => void setStatus.run(game, 'DRAFT')}>
                  <ArchiveRestore aria-hidden="true" />
                  Restaurar como borrador
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setArchiving(game)}>
                    <Archive aria-hidden="true" />
                    Archivar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="Minijuegos"
        description="Qué juegos ven los estudiantes, cuánto cuestan y cuánto pagan."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden="true" />
            Crear minijuego
          </Button>
        }
      />

      {query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={query.reload} title="No pudimos cargar los minijuegos" />
      ) : rows?.length === 0 ? (
        <EmptyState
          icon={Gamepad2}
          title="Todavía no hay minijuegos"
          description="Crea el primero: eliges uno de los contenidos de la web y le pones costo y premio."
        />
      ) : (
        <DataTable
          caption="Catálogo de minijuegos, incluidos borradores y archivados"
          columns={columns}
          rows={rows}
          rowKey={(game) => game.id}
          loading={!query.data}
          refreshing={query.isRefreshing || setStatus.isPending}
          skeletonRows={3}
        />
      )}

      <MinigameFormDialog
        target={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => {
          setEditing(null)
          query.reload()
        }}
      />
      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
        title="¿Archivar este juego?"
        description={
          archiving &&
          `«${archiving.title}» deja de aparecer en la app. Las partidas ya jugadas se conservan y puedes restaurarlo después.`
        }
        confirmLabel="Archivar"
        pendingLabel="Archivando…"
        onConfirm={() => archiving && void archive.run(archiving)}
        pending={archive.isPending}
      />
    </>
  )
}
