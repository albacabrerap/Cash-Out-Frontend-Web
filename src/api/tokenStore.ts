import type { AuthResponse } from '@/types/auth'

/**
 * El access token vive solo en memoria. El refresh token va a localStorage para
 * sobrevivir a un F5; lo protege que el backend lo rota en cada uso y revoca la
 * sesion si alguien reusa uno viejo.
 */

const REFRESH_KEY = 'cashout.refreshToken'

export type SessionEvent =
  | { type: 'refreshed'; auth: AuthResponse }
  | { type: 'cleared'; reason: SessionEndReason }

export type SessionEndReason = 'logout' | 'expired' | 'other-tab'

let accessToken: string | null = null
const listeners = new Set<(event: SessionEvent) => void>()

// localStorage lanza en modo privado o con la cuota llena.
function readRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

function writeRefreshToken(token: string): void {
  try {
    localStorage.setItem(REFRESH_KEY, token)
  } catch {
    // La sesion sigue funcionando, solo no sobrevive a recargar.
  }
}

function removeRefreshToken(): void {
  try {
    localStorage.removeItem(REFRESH_KEY)
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}

function emit(event: SessionEvent): void {
  listeners.forEach((listener) => listener(event))
}

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken
  },

  /** Se lee cada vez: si otra pestana lo roto, hay que usar el nuevo. */
  getRefreshToken(): string | null {
    return readRefreshToken()
  },

  setSession(auth: AuthResponse): void {
    accessToken = auth.accessToken
    writeRefreshToken(auth.refreshToken)
    emit({ type: 'refreshed', auth })
  },

  clear(reason: SessionEndReason): void {
    accessToken = null
    removeRefreshToken()
    emit({ type: 'cleared', reason })
  },

  subscribe(listener: (event: SessionEvent) => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

// Cerrar sesion en una pestana la cierra en las demas.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === REFRESH_KEY && event.newValue === null && accessToken !== null) {
      accessToken = null
      emit({ type: 'cleared', reason: 'other-tab' })
    }
  })
}
