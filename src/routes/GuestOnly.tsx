import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { PageLoader } from '@/components/feedback/PageLoader'
import { homePathFor } from './navigation'
import type { LoginRedirectState } from './RequireAuth'

/** Solo rutas internas ("/algo"): evita una redireccion abierta a "//otro-sitio.com". */
function safeInternalPath(path: string | undefined): string | undefined {
  return path && path.startsWith('/') && !path.startsWith('//') ? path : undefined
}

/** Tras iniciar sesion es esta guarda la que redirige, no el formulario. */
export function GuestOnly() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'restoring') return <PageLoader label="Recuperando tu sesión…" />

  if (status === 'authenticated') {
    const from = safeInternalPath((location.state as LoginRedirectState | null)?.from)
    return <Navigate to={from ?? homePathFor(user)} replace />
  }

  return <Outlet />
}
