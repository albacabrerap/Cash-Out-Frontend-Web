import { isAxiosError } from 'axios'
import type { ErrorResponseBody } from '@/types/api'

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'canceled' | 'unknown'

/** Unico tipo de error que sale de la capa de API; los componentes nunca ven un AxiosError. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly serverMessage?: string
  readonly fieldErrors: Record<string, string>

  constructor(params: {
    kind: ApiErrorKind
    status?: number
    serverMessage?: string
    fieldErrors?: Record<string, string>
    cause?: unknown
  }) {
    super(params.serverMessage ?? params.kind, { cause: params.cause })
    this.name = 'ApiError'
    this.kind = params.kind
    this.status = params.status
    this.serverMessage = params.serverMessage
    this.fieldErrors = params.fieldErrors ?? {}
  }

  get isCanceled(): boolean {
    return this.kind === 'canceled'
  }

  /** Un 4xx se repetiria igual; solo vale reintentar sin red, por timeout o con un 5xx. */
  get retryable(): boolean {
    if (this.kind === 'network' || this.kind === 'timeout') return true
    return this.status !== undefined && this.status >= 500 && this.status !== 501
  }
}

function isErrorBody(data: unknown): data is ErrorResponseBody {
  return typeof data === 'object' && data !== null && 'status' in data && 'message' in data
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') {
      return new ApiError({ kind: 'canceled', cause: error })
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ kind: 'timeout', cause: error })
    }
    if (!error.response) {
      return new ApiError({ kind: 'network', cause: error })
    }

    const data: unknown = error.response.data
    const body = isErrorBody(data) ? data : undefined
    const fieldErrors = Object.fromEntries(
      (body?.fieldErrors ?? []).map(({ field, message }) => [field, message]),
    )

    return new ApiError({
      kind: 'http',
      status: error.response.status,
      serverMessage: body?.message,
      fieldErrors,
      cause: error,
    })
  }

  return new ApiError({ kind: 'unknown', cause: error })
}

/** En 400, 404 y 409 el mensaje del backend ya esta escrito para el usuario y se usa tal cual. */
export function userMessage(error: ApiError): string {
  switch (error.kind) {
    case 'canceled':
      return ''
    case 'network':
      return 'No pudimos conectar con el servidor. Revisa tu conexión a internet.'
    case 'timeout':
      return 'El servidor tardó demasiado en responder. Vuelve a intentarlo.'
    case 'unknown':
      return 'Ocurrió un error inesperado. Vuelve a intentarlo.'
    case 'http':
      break
  }

  switch (error.status) {
    case 400:
      return error.serverMessage ?? 'Revisa los datos ingresados.'
    case 401:
      return 'Tu sesión expiró. Inicia sesión de nuevo.'
    case 403:
      return 'No tienes permiso para realizar esta acción.'
    case 404:
      return error.serverMessage ?? 'No encontramos lo que buscas.'
    case 409:
      return error.serverMessage ?? 'Los datos cambiaron mientras trabajabas. Vuelve a intentarlo.'
    case 429:
      return 'Hiciste demasiadas solicitudes seguidas. Espera un momento.'
    default:
      return 'Algo falló en el servidor. Inténtalo de nuevo en unos segundos.'
  }
}
