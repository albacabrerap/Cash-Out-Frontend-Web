import axios, {
  isAxiosError,
  type AxiosAdapter,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { AuthResponse } from '@/types/auth'
import { ApiError, toApiError } from './errors'
import { tokenStore } from './tokenStore'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** En login/registro un 401 son credenciales incorrectas, no una sesion por renovar. */
    skipAuthRefresh?: boolean
  }
}

interface TrackedConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
  _sentToken?: string | null
}

export interface ApiClientOptions {
  baseURL: string
  timeoutMs?: number
  /** Solo para tests. */
  adapter?: AxiosAdapter
}

export interface ApiClient {
  http: AxiosInstance
  refreshSession(): Promise<AuthResponse>
}

const REFRESH_LOCK = 'cashout:refresh'

/** Con varias pestanas abiertas, solo una renueva la sesion a la vez. */
function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  return locks ? locks.request(REFRESH_LOCK, task) : task()
}

/**
 * Cada refresh token sirve una sola vez y el backend trata el reuso como robo,
 * asi que la renovacion es de un solo vuelo: todos los 401 simultaneos esperan
 * el mismo refresh en vez de lanzar uno cada uno.
 */
export function createApiClient({ baseURL, timeoutMs = 15_000, adapter }: ApiClientOptions): ApiClient {
  const defaults = {
    baseURL,
    timeout: timeoutMs,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    adapter,
  }

  const http = axios.create(defaults)
  // Sin interceptores: un 401 del propio refresh no debe intentar otro refresh.
  const bare = axios.create(defaults)

  let inFlight: Promise<AuthResponse> | null = null

  async function performRefresh(): Promise<AuthResponse> {
    const refreshToken = tokenStore.getRefreshToken()
    if (!refreshToken) {
      throw new ApiError({ kind: 'http', status: 401, serverMessage: 'No hay una sesión activa.' })
    }

    try {
      const { data } = await bare.post<AuthResponse>('/auth/refresh', { refreshToken })
      tokenStore.setSession(data)
      return data
    } catch (error) {
      const apiError = toApiError(error)
      // Sin red la sesion puede seguir siendo valida: solo un 401 la cierra.
      if (apiError.status === 401) tokenStore.clear('expired')
      throw apiError
    }
  }

  function refreshSession(): Promise<AuthResponse> {
    inFlight ??= withCrossTabLock(performRefresh).finally(() => {
      inFlight = null
    })
    return inFlight
  }

  http.interceptors.request.use((config: TrackedConfig) => {
    const token = tokenStore.getAccessToken()
    config._sentToken = token
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
    return config
  })

  http.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!isAxiosError(error) || error.response?.status !== 401) {
        throw toApiError(error)
      }

      const config = error.config as TrackedConfig | undefined
      if (!config || config._retried || config.skipAuthRefresh) {
        throw toApiError(error)
      }
      config._retried = true

      // El token se renovo mientras la peticion viajaba: reintentar sin otro refresh.
      const current = tokenStore.getAccessToken()
      if (current && current !== config._sentToken) {
        return http(config)
      }

      if (tokenStore.getRefreshToken() === null) {
        throw toApiError(error)
      }

      try {
        await refreshSession()
      } catch {
        throw toApiError(error)
      }
      return http(config)
    },
  )

  return { http, refreshSession }
}

export const api = createApiClient({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
})

export const http = api.http
