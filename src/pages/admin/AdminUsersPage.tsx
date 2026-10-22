import { useState } from 'react'
import { Ban, LockOpen, MoreHorizontal, SearchX, UserCheck, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useAuth } from '@/hooks/useAuth'
import { formatServerDate } from '@/lib/format'
import { ROLE_LABEL, USER_STATUS_LABEL } from '@/lib/users'
import { userService } from '@/services/userService'
import type { User } from '@/types/auth'
import { DataTable, type Column } from '@/components/data/DataTable'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { SearchInput } from '@/components/filters/SearchInput'
import { RoleDialog } from '@/components/admin/RoleDialog'
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

const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export default function AdminUsersPage() {
  const { user: me } = useAuth()
  const query = useApiQuery(['admin-users'], (signal) => userService.list(signal))
  const [search, setSearch] = useState('')
  const [editingRole, setEditingRole] = useState<User | null>(null)
  const [blocking, setBlocking] = useState<User | null>(null)

  const changeStatus = useAsyncAction(async (user: User, status: 'ACTIVE' | 'BLOCKED') => {
    try {
      await userService.setStatus(user.id, status)
      toast.success(
        status === 'BLOCKED'
          ? `Bloqueaste la cuenta de ${user.name}`
          : user.status === 'INACTIVE'
            ? `Reactivaste la cuenta de ${user.name}`
            : `Desbloqueaste la cuenta de ${user.name}`,
      )
      query.reload()
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
    } finally {
      setBlocking(null)
    }
  })

  const term = normalize(search.trim())
  const rows = query.data
    ?.filter((user) => !term || normalize(`${user.name} ${user.email}`).includes(term))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const columns: Column<User>[] = [
    {
      id: 'user',
      header: 'Cuenta',
      className: 'w-full max-w-0',
      cell: (user) => (
        <div>
          <p className="flex items-center gap-2 truncate font-medium">
            {user.name}
            {user.id === me?.id && <Badge variant="outline">Tú</Badge>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      ),
    },
    {
      id: 'roles',
      header: 'Rol',
      cell: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <Badge key={role} variant={role === 'ADMIN' ? 'default' : 'secondary'}>
              {ROLE_LABEL[role]}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      className: 'hidden sm:table-cell',
      cell: (user) => (
        <Badge variant={user.status === 'ACTIVE' ? 'outline' : user.status === 'BLOCKED' ? 'destructive' : 'secondary'}>
          {USER_STATUS_LABEL[user.status]}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      header: 'Registro',
      className: 'hidden md:table-cell',
      cell: (user) => <span className="whitespace-nowrap text-muted-foreground">{formatServerDate(user.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: <span className="sr-only">Acciones</span>,
      className: 'w-0',
      // Tu propia cuenta no se administra desde aqui: el backend tampoco lo permite.
      cell: (user) =>
        user.id === me?.id ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Acciones de la cuenta ${user.email}`}>
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditingRole(user)}>
                <UserCog aria-hidden="true" />
                Cambiar rol
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.status === 'ACTIVE' ? (
                <DropdownMenuItem variant="destructive" onSelect={() => setBlocking(user)}>
                  <Ban aria-hidden="true" />
                  Bloquear cuenta
                </DropdownMenuItem>
              ) : user.status === 'BLOCKED' ? (
                <DropdownMenuItem onSelect={() => void changeStatus.run(user, 'ACTIVE')}>
                  <LockOpen aria-hidden="true" />
                  Desbloquear
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => void changeStatus.run(user, 'ACTIVE')}>
                  <UserCheck aria-hidden="true" />
                  Reactivar cuenta
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Usuarios"
        description={
          query.data
            ? `${query.data.length} ${query.data.length === 1 ? 'cuenta registrada' : 'cuentas registradas'}, de la más reciente a la más antigua.`
            : 'Las cuentas registradas en Cash-Out.'
        }
      />

      <SearchInput
        className="sm:w-80"
        defaultValue=""
        onSearch={setSearch}
        label="Buscar cuentas"
        placeholder="Busca por nombre o correo"
      />

      {query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={query.reload} title="No pudimos cargar las cuentas" />
      ) : rows && rows.length === 0 ? (
        <EmptyState icon={SearchX} title="Ninguna cuenta coincide" description="Prueba con otra parte del nombre o del correo." />
      ) : (
        <DataTable
          caption="Cuentas de Cash-Out"
          columns={columns}
          rows={rows}
          rowKey={(user) => user.id}
          loading={!query.data}
          refreshing={query.isRefreshing || changeStatus.isPending}
          skeletonRows={5}
        />
      )}

      <RoleDialog
        user={editingRole}
        onOpenChange={(open) => !open && setEditingRole(null)}
        onSaved={() => {
          setEditingRole(null)
          query.reload()
        }}
      />
      <ConfirmDialog
        open={blocking !== null}
        onOpenChange={(open) => !open && setBlocking(null)}
        title={blocking ? `¿Bloquear a ${blocking.name}?` : ''}
        description="No podrá entrar ni usar la app: su sesión se corta en su siguiente acción. Sus datos se conservan y puedes desbloquearla cuando quieras."
        confirmLabel="Bloquear"
        pendingLabel="Bloqueando…"
        onConfirm={() => blocking && void changeStatus.run(blocking, 'BLOCKED')}
        pending={changeStatus.isPending}
      />
    </>
  )
}
