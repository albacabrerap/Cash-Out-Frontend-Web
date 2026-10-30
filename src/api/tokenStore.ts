import type { AuthResponse } from '@/types/auth'

/**
 * El access token vive solo en memoria. El de refresco ya no pasa por
 * JavaScript: el backend lo deja en una cookie HttpOnly que un XSS no puede
 * leer. Aqui solo queda una marca sin secretos de que hay sesion, para saber
 * si vale la pena restaurarla al recargar y para cerrar todas las pestanas.
 */

const SESSION_KEY = 'cashout.session'
/** Donde vivia el token de refresco antes de la cookie: se borra si quedo. */
const LEGACY_REFRESH_KEY = 'cashout.refreshToken'

export type SessionEvent =
  | { type: 'refreshed'; auth: AuthResponse }
  | { type: 'cleared'; reason: SessionEndReason }

export type SessionEndReason = 'logout' | 'expired' | 'other-tab'

let accessToken: string | null = null
const listeners = new Set<(event: SessionEvent) => void>()

// localStorage lanza en modo privado o con la cuota llena.
function readFlag(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function writeFlag(on: boolean): void {
  try {
    if (on) localStorage.setItem(SESSION_KEY, '1')
    else localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(LEGACY_REFRESH_KEY)
  } catch {
    // Sin almacenamiento la sesion sigue, solo no se restaura al recargar.
  }
}

function emit(event: SessionEvent): void {
  listeners.forEach((listener) => listener(event))
}

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken
  },

  /** Si hubo una sesion en este navegador; la cookie la confirma o no al refrescar. */
  hasSession(): boolean {
    return readFlag()
  },

  setSession(auth: AuthResponse): void {
    accessToken = auth.accessToken
    writeFlag(true)
    emit({ type: 'refreshed', auth })
  },

  clear(reason: SessionEndReason): void {
    accessToken = null
    writeFlag(false)
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
    if (event.key === SESSION_KEY && event.newValue === null && accessToken !== null) {
      accessToken = null
      emit({ type: 'cleared', reason: 'other-tab' })
    }
  })
}
