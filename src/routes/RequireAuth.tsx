import { useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { CloudOff, LogOut, RefreshCw, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types/auth'
import { PageLoader } from '@/components/feedback/PageLoader'
import { Button } from '@/components/ui/button'
import { homePathFor } from './navigation'

export interface LoginRedirectState {
  from?: string
}

/** Mientras se recupera la sesion espera: un F5 tiene que quedarse en la misma pagina. */
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { status, user, endReason } = useAuth()
  const location = useLocation()

  if (status === 'restoring') return <PageLoader fullScreen label="Recuperando tu sesión…" />
  if (status === 'unavailable') return <SessionUnavailable />

  if (status === 'anonymous') {
    // Tras un logout voluntario no se recuerda la pagina: puede entrar otra persona.
    const state: LoginRedirectState | undefined =
      endReason === 'logout' ? undefined : { from: location.pathname + location.search }
    return <Navigate to="/login" replace state={state} />
  }

  if (roles && !roles.some((role) => user?.roles.includes(role))) {
    return <Forbidden homePath={homePathFor(user)} />
  }

  return <Outlet />
}

/** La sesion probablemente sigue valida: se ofrece reintentar en vez de pedir la contrasena. */
function SessionUnavailable() {
  const { retryRestore, logout } = useAuth()
  const [leaving, setLeaving] = useState(false)

  return (
    <div role="alert" className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <CloudOff className="size-10 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">No pudimos conectar con Cash-Out</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Tu sesión sigue guardada, pero el servidor no respondió. Revisa tu conexión e inténtalo de nuevo.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={retryRestore}>
          <RefreshCw aria-hidden="true" />
          Reintentar
        </Button>
        <Button
          variant="outline"
          disabled={leaving}
          onClick={() => {
            setLeaving(true)
            void logout()
          }}
        >
          <LogOut aria-hidden="true" />
          Cerrar sesión en este equipo
        </Button>
      </div>
    </div>
  )
}

function Forbidden({ homePath }: { homePath: string }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Esta sección no es para tu cuenta</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Tu rol no tiene acceso a esta página. Si crees que es un error, pide a un administrador que revise tu
          cuenta.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to={homePath}>Volver a mi resumen</Link>
      </Button>
    </div>
  )
}
