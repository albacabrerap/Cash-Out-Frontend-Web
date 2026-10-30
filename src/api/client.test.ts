import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AuthResponse } from '@/types/auth'
import { createApiClient } from './client'
import { ApiError } from './errors'
import { tokenStore, type SessionEvent } from './tokenStore'

/**
 * Backend falso con la misma regla que el real: cada refresh token sirve una
 * sola vez. El token vive en la cookie, que aqui simula el navegador: la manda
 * sola y la reemplaza con cada respuesta.
 */
function fakeBackend() {
  let validAccess = 'access-1'
  let validRefresh = 'refresh-1'
  let generation = 1
  const state = {
    refreshCalls: 0,
    refreshRejectsWith: undefined as undefined | 'network' | 401,
    cookie: 'refresh-1' as string | null,
    refreshBodies: [] as unknown[],
    sessionModes: [] as unknown[],
  }

  const reply = (config: InternalAxiosRequestConfig, status: number, data: unknown) => {
    const response = { data, status, statusText: String(status), headers: {}, config }
    if (status >= 400) {
      throw new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_REQUEST, config, null, response)
    }
    return response
  }

  const adapter: AxiosAdapter = async (config) => {
    // Un respiro asincrono, para que las peticiones simultaneas se crucen de verdad.
    await new Promise((resolve) => setTimeout(resolve, 5))

    if (config.signal?.aborted) {
      throw new AxiosError('canceled', AxiosError.ERR_CANCELED, config)
    }

    if (config.url === '/auth/refresh') {
      state.refreshCalls++
      if (state.refreshRejectsWith === 'network') {
        throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
      }
      state.refreshBodies.push(config.data)
      state.sessionModes.push(AxiosHeaders.from(config.headers).get('X-Session-Mode'))
      if (state.refreshRejectsWith === 401 || state.cookie !== validRefresh) {
        state.cookie = null
        return reply(config, 401, { status: 401, message: 'La sesion ya no es valida.' })
      }
      generation++
      validAccess = `access-${generation}`
      validRefresh = `refresh-${generation}`
      state.cookie = validRefresh
      const auth: Partial<AuthResponse> = { accessToken: validAccess }
      return reply(config, 200, auth)
    }

    if (config.url === '/auth/login') {
      return reply(config, 401, { status: 401, message: 'Credenciales incorrectas.' })
    }

    const header = AxiosHeaders.from(config.headers).get('Authorization')
    if (header !== `Bearer ${validAccess}`) {
      return reply(config, 401, { status: 401, message: 'Debes autenticarte.' })
    }
    return reply(config, 200, { ok: true, url: config.url })
  }

  return { adapter, state, expireAccess: () => { validAccess = 'rotated-on-server' } }
}

/** Sesion con el access token ya vencido. */
function startWithExpiredAccess() {
  tokenStore.setSession({ accessToken: 'stale' } as AuthResponse)
}

describe('cliente HTTP: renovacion de sesion', () => {
  beforeEach(() => {
    tokenStore.clear('logout')
  })

  it('cinco peticiones con 401 simultaneo comparten UN solo refresh', async () => {
    const backend = fakeBackend()
    const { http } = createApiClient({ baseURL: '/api/v1', adapter: backend.adapter })
    startWithExpiredAccess()

    const results = await Promise.all(
      ['/a', '/b', '/c', '/d', '/e'].map((url) => http.get(url)),
    )

    expect(backend.state.refreshCalls).toBe(1)
    expect(results.map((r) => r.data.url)).toEqual(['/a', '/b', '/c', '/d', '/e'])
    expect(backend.state.cookie).toBe('refresh-2')
    // El token nunca pasa por JavaScript: el refresh va sin cuerpo y pide la cookie.
    expect(backend.state.refreshBodies).toEqual([undefined])
    expect(backend.state.sessionModes).toEqual(['cookie'])
    expect(tokenStore.hasSession()).toBe(true)
  })

  it('si el refresh responde 401, la sesion se cierra como expirada', async () => {
    const backend = fakeBackend()
    backend.state.refreshRejectsWith = 401
    const { http } = createApiClient({ baseURL: '/api/v1', adapter: backend.adapter })
    startWithExpiredAccess()

    const events: SessionEvent[] = []
    const unsubscribe = tokenStore.subscribe((e) => events.push(e))

    const error = await http.get('/a').catch((e: unknown) => e)
    unsubscribe()

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
    expect(tokenStore.hasSession()).toBe(false)
    expect(events).toContainEqual({ type: 'cleared', reason: 'expired' })
  })

  it('sin conexion durante el refresh, la sesion NO se borra', async () => {
    const backend = fakeBackend()
    backend.state.refreshRejectsWith = 'network'
    const { http } = createApiClient({ baseURL: '/api/v1', adapter: backend.adapter })
    startWithExpiredAccess()

    await expect(http.get('/a')).rejects.toBeInstanceOf(ApiError)
    expect(tokenStore.hasSession()).toBe(true)
  })

  it('un 401 del login es "credenciales incorrectas" y no dispara un refresh', async () => {
    const backend = fakeBackend()
    const { http } = createApiClient({ baseURL: '/api/v1', adapter: backend.adapter })
    startWithExpiredAccess()

    const error = await http
      .post('/auth/login', {}, { skipAuthRefresh: true })
      .then(() => expect.fail('el login tenia que fallar'), (e: unknown) => e as ApiError)

    expect(error.status).toBe(401)
    expect(error.serverMessage).toBe('Credenciales incorrectas.')
    expect(backend.state.refreshCalls).toBe(0)
  })

  it('sin sesion en este navegador no intenta renovar', async () => {
    const backend = fakeBackend()
    const { http } = createApiClient({ baseURL: '/api/v1', adapter: backend.adapter })

    await expect(http.get('/a')).rejects.toMatchObject({ status: 401 })
    expect(backend.state.refreshCalls).toBe(0)
  })

  it('una peticion cancelada con AbortController no se trata como error de usuario', async () => {
    const backend = fakeBackend()
    const { http } = createApiClient({ baseURL: '/api/v1', adapter: backend.adapter })
    const controller = new AbortController()
    controller.abort()

    const error = await http
      .get('/a', { signal: controller.signal })
      .then(() => expect.fail('la peticion cancelada tenia que fallar'), (e: unknown) => e as ApiError)

    expect(error.isCanceled).toBe(true)
  })

  it('reintenta una sola vez: no entra en bucle si el servidor sigue diciendo 401', async () => {
    const backend = fakeBackend()
    const { http } = createApiClient({ baseURL: '/api/v1', adapter: backend.adapter })
    startWithExpiredAccess()
    // El refresh funciona, pero el servidor invalida el access token nuevo enseguida.
    const original = backend.adapter
    let calls = 0
    const { http: flaky } = createApiClient({
      baseURL: '/api/v1',
      adapter: async (config) => {
        calls++
        const response = await original(config)
        if (config.url === '/auth/refresh') backend.expireAccess()
        return response
      },
    })

    await expect(flaky.get('/a')).rejects.toMatchObject({ status: 401 })
    expect(calls).toBe(3) // peticion, refresh, reintento. Nada mas.
    expect(http).toBeDefined()
  })
})
