import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { tokenStore, type SessionEndReason } from '@/api/tokenStore'
import { authService } from '@/services/authService'
import type { LoginRequest, RegisterRequest, Role, User } from '@/types/auth'
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext'

/** Traduce los eventos de tokenStore en usuario y estado de sesion para la UI. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStore.hasSession() ? 'restoring' : 'anonymous',
  )
  const [endReason, setEndReason] = useState<SessionEndReason | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    return tokenStore.subscribe((event) => {
      if (event.type === 'refreshed') {
        if (event.auth.user) setUser(event.auth.user)
        setStatus('authenticated')
        setEndReason(null)
      } else {
        setUser(null)
        setStatus('anonymous')
        setEndReason(event.reason)
      }
    })
  }, [])

  useEffect(() => {
    if (!tokenStore.hasSession()) return

    // StrictMode lo ejecuta dos veces; el refresh de un solo vuelo evita gastar el token dos veces.
    let active = true
    authService.restore().catch((error: { status?: number }) => {
      if (!active) return
      // Un 401 ya cerro la sesion; cualquier otro error es que el servidor no respondio.
      if (error.status !== 401) setStatus('unavailable')
    })
    return () => {
      active = false
    }
  }, [attempt])

  const login = useCallback(async (request: LoginRequest, signal?: AbortSignal) => {
    const auth = await authService.login(request, signal)
    return auth.user
  }, [])

  const register = useCallback(async (request: RegisterRequest, signal?: AbortSignal) => {
    const result = await authService.register(request, signal)
    return { user: result.user, verificationRequired: 'emailVerificationRequired' in result }
  }, [])

  const verifyEmail = useCallback(async (token: string, signal?: AbortSignal) => {
    const auth = await authService.verifyEmail(token, signal)
    return auth.user
  }, [])

  const loginWithGoogle = useCallback(async (credential: string) => {
    const auth = await authService.google(credential)
    return auth.user
  }, [])

  const logout = useCallback(() => authService.logout(), [])

  const retryRestore = useCallback(() => {
    setStatus('restoring')
    setAttempt((n) => n + 1)
  }, [])

  const hasRole = useCallback((role: Role) => user?.roles.includes(role) ?? false, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      endReason,
      login,
      register,
      verifyEmail,
      loginWithGoogle,
      logout,
      updateUser: setUser,
      retryRestore,
      hasRole,
    }),
    [status, user, endReason, login, register, verifyEmail, loginWithGoogle, logout, retryRestore, hasRole],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
