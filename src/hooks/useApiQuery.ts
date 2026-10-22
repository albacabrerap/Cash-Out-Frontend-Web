import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { toApiError, type ApiError } from '@/api/errors'

export interface ApiQuery<T> {
  data: T | undefined
  error: ApiError | undefined
  isLoading: boolean
  /** Recargando con datos previos en pantalla. */
  isRefreshing: boolean
  reload(): void
}

interface Settled<T> {
  request: string
  data?: T
  error?: ApiError
}

/**
 * `key` se compara por su JSON, asi que tiene que ser serializable. Al cambiar
 * la clave o desmontar, la peticion anterior se cancela.
 */
export function useApiQuery<T>(
  key: readonly unknown[],
  fetcher: (signal: AbortSignal) => Promise<T>,
): ApiQuery<T> {
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<T>>()

  const request = JSON.stringify([key, nonce])

  const run = useEffectEvent((signal: AbortSignal) => fetcher(signal))

  useEffect(() => {
    const controller = new AbortController()

    // Por si el fetcher ignora la senal: una respuesta vieja pisaria a la nueva.
    run(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setSettled({ request, data })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const error = toApiError(err)
        // Si falla una recarga se conservan los datos anteriores.
        if (!error.isCanceled) setSettled((previous) => ({ request, data: previous?.data, error }))
      })

    return () => controller.abort()
  }, [request])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const isCurrent = settled?.request === request
  return {
    data: settled?.data,
    error: isCurrent ? settled?.error : undefined,
    isLoading: !isCurrent && settled === undefined,
    isRefreshing: !isCurrent && settled !== undefined,
    reload,
  }
}
