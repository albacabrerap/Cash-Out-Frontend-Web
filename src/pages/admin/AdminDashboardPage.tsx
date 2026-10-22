import { Link } from 'react-router'
import { ChartCandlestick, Gamepad2, Users } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { formatServerDate } from '@/lib/format'
import { ROLE_LABEL } from '@/lib/users'
import { marketService } from '@/services/marketService'
import { minigameService } from '@/services/minigameService'
import { userService } from '@/services/userService'
import { StatCard } from '@/components/data/StatCard'
import { ErrorState } from '@/components/feedback/ErrorState'
import { CatalogSyncCard } from '@/components/admin/CatalogSyncCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const count = new Intl.NumberFormat('es-PE')

export default function AdminDashboardPage() {
  const users = useApiQuery(['admin-users'], (signal) => userService.list(signal))
  const games = useApiQuery(['admin-minigames'], (signal) => minigameService.listAll(signal))
  // Con size=1 solo interesa totalElements.
  const allAssets = useApiQuery(['admin-assets-total', 'all'], (signal) =>
    marketService.searchAllAssets({ page: 0, size: 1 }, signal),
  )
  const activeAssets = useApiQuery(['admin-assets-total', 'active'], (signal) =>
    marketService.searchAssets({ page: 0, size: 1 }, signal),
  )

  const userList = users.data
  const activeUsers = userList?.filter((user) => user.status === 'ACTIVE').length ?? 0
  const admins = userList?.filter((user) => user.roles.includes('ADMIN')).length ?? 0
  const published = games.data?.filter((game) => game.status === 'PUBLISHED').length ?? 0
  const totalAssets = allAssets.data?.totalElements
  const tradable = activeAssets.data?.totalElements
  const recent = userList && [...userList].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <>
      <PageHeader title="Panel de administración" description="El estado de las cuentas y los catálogos de Cash-Out." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Cuentas"
          icon={Users}
          value={userList && count.format(userList.length)}
          hint={userList ? `${activeUsers} activas · ${admins} de administración` : 'Registradas en Cash-Out.'}
          error={users.error}
          onRetry={users.reload}
        />
        <StatCard
          label="Minijuegos publicados"
          icon={Gamepad2}
          value={games.data && `${published} de ${games.data.length}`}
          hint="Los borradores y archivados no se ven en la app."
          error={games.error}
          onRetry={games.reload}
        />
        <StatCard
          label="Acciones disponibles"
          icon={ChartCandlestick}
          value={tradable === undefined ? undefined : count.format(tradable)}
          hint={
            totalAssets !== undefined && tradable !== undefined
              ? `${count.format(totalAssets - tradable)} dadas de baja`
              : 'Las que se pueden comprar.'
          }
          error={activeAssets.error ?? allAssets.error}
          onRetry={() => {
            activeAssets.reload()
            allAssets.reload()
          }}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <CatalogSyncCard
          onSynced={() => {
            activeAssets.reload()
            allAssets.reload()
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Últimos registros</h2>
            </CardTitle>
            <CardDescription>Las cuentas más recientes.</CardDescription>
            <CardAction>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/usuarios">Ver todas</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {users.error && !userList ? (
              <ErrorState error={users.error} onRetry={users.reload} title="No pudimos cargar las cuentas" />
            ) : recent ? (
              <ul className="divide-y">
                {recent.map((user) => (
                  <li key={user.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={user.roles.includes('ADMIN') ? 'default' : 'secondary'}>
                        {ROLE_LABEL[user.roles.includes('ADMIN') ? 'ADMIN' : user.roles[0]]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatServerDate(user.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-3" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
