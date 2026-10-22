import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { ApiError, toApiError, userMessage } from './errors'

const config = { headers: {} } as InternalAxiosRequestConfig

function httpError(status: number, data?: unknown) {
  return new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', config, null, {
    data,
    status,
    statusText: '',
    headers: {},
    config,
  })
}

describe('toApiError', () => {
  it('extrae el mensaje y los errores por campo del ErrorResponseDTO', () => {
    const error = toApiError(
      httpError(400, {
        status: 400,
        message: 'La solicitud tiene errores de validacion.',
        fieldErrors: [
          { field: 'email', message: 'must be a well-formed email address' },
          { field: 'password', message: 'size must be between 8 and 100' },
        ],
      }),
    )

    expect(error.kind).toBe('http')
    expect(error.status).toBe(400)
    expect(error.fieldErrors).toEqual({
      email: 'must be a well-formed email address',
      password: 'size must be between 8 and 100',
    })
  })

  it('distingue sin conexion, timeout y cancelacion', () => {
    expect(toApiError(new AxiosError('x', AxiosError.ERR_NETWORK, config)).kind).toBe('network')
    expect(toApiError(new AxiosError('x', 'ECONNABORTED', config)).kind).toBe('timeout')
    expect(toApiError(new AxiosError('x', AxiosError.ERR_CANCELED, config)).kind).toBe('canceled')
  })

  it('tolera un 502 cuyo cuerpo es HTML del balanceador, no JSON', () => {
    const error = toApiError(httpError(502, '<html>Bad Gateway</html>'))
    expect(error.status).toBe(502)
    expect(error.serverMessage).toBeUndefined()
    expect(error.retryable).toBe(true)
  })
})

describe('userMessage: cada codigo se explica distinto', () => {
  const cases: Array<[number, string | undefined, string]> = [
    [400, 'El monto supera tu saldo disponible.', 'El monto supera tu saldo disponible.'],
    [401, undefined, 'Tu sesión expiró. Inicia sesión de nuevo.'],
    [403, undefined, 'No tienes permiso para realizar esta acción.'],
    [404, undefined, 'No encontramos lo que buscas.'],
    [409, 'Ya existe una cuenta con ese correo.', 'Ya existe una cuenta con ese correo.'],
    [500, 'NullPointerException en ...', 'Algo falló en el servidor. Inténtalo de nuevo en unos segundos.'],
  ]

  it.each(cases)('HTTP %i', (status, serverMessage, expected) => {
    expect(userMessage(new ApiError({ kind: 'http', status, serverMessage }))).toBe(expected)
  })

  it('un 500 nunca filtra el detalle tecnico del servidor', () => {
    const message = userMessage(new ApiError({ kind: 'http', status: 500, serverMessage: 'SQLException: ...' }))
    expect(message).not.toContain('SQL')
  })

  it('solo lo transitorio se marca como reintentable', () => {
    expect(new ApiError({ kind: 'network' }).retryable).toBe(true)
    expect(new ApiError({ kind: 'http', status: 503 }).retryable).toBe(true)
    expect(new ApiError({ kind: 'http', status: 400 }).retryable).toBe(false)
    expect(new ApiError({ kind: 'http', status: 409 }).retryable).toBe(false)
  })
})
