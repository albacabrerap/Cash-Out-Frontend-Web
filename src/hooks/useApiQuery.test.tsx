import { act, renderHook, waitFor } from '@testing-library/react'
import { ApiError } from '@/api/errors'
import { useApiQuery } from './useApiQuery'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useApiQuery', () => {
  it('empieza cargando y luego entrega los datos', async () => {
    const { result } = renderHook(() => useApiQuery(['a'], async () => 42))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()

    await waitFor(() => expect(result.current.data).toBe(42))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeUndefined()
  })

  it('una respuesta vieja que llega tarde no pisa a la nueva', async () => {
    const page2 = deferred<string>()
    const page3 = deferred<string>()
    const signals: Record<number, AbortSignal> = {}

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useApiQuery(['items', page], (signal) => {
          signals[page] = signal
          return page === 2 ? page2.promise : page3.promise
        }),
      { initialProps: { page: 2 } },
    )

    // El usuario pasa a la pagina 3 antes de que la 2 responda.
    rerender({ page: 3 })
    expect(signals[2].aborted).toBe(true)

    // La 3 responde primero y la 2 llega despues, ya cancelada.
    await act(async () => page3.resolve('pagina 3'))
    await act(async () => page2.resolve('pagina 2'))

    expect(result.current.data).toBe('pagina 3')
  })

  it('si falla una recarga conserva los datos anteriores junto al error', async () => {
    let call = 0
    const { result } = renderHook(() =>
      useApiQuery(['a'], async () => {
        call += 1
        if (call === 1) return 'datos'
        throw new ApiError({ kind: 'network' })
      }),
    )
    await waitFor(() => expect(result.current.data).toBe('datos'))

    act(() => result.current.reload())
    // Mientras recarga no se tapan los datos con un esqueleto.
    expect(result.current.isRefreshing).toBe(true)
    expect(result.current.data).toBe('datos')

    await waitFor(() => expect(result.current.error?.kind).toBe('network'))
    expect(result.current.data).toBe('datos')
  })

  it('la misma clave con objetos nuevos no vuelve a pedir', async () => {
    const fetcher = vi.fn(async () => 'ok')
    const { result, rerender } = renderHook(
      ({ filters }: { filters: { q: string } }) => useApiQuery(['items', filters], fetcher),
      { initialProps: { filters: { q: 'cafe' } } },
    )
    await waitFor(() => expect(result.current.data).toBe('ok'))

    // Un objeto distinto con los mismos valores: es la misma peticion.
    rerender({ filters: { q: 'cafe' } })
    expect(fetcher).toHaveBeenCalledTimes(1)

    rerender({ filters: { q: 'taxi' } })
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })

  it('al desmontar cancela la peticion y no la reporta como error', async () => {
    const pending = deferred<string>()
    let captured: AbortSignal | undefined
    const { result, unmount } = renderHook(() =>
      useApiQuery(['a'], (signal) => {
        captured = signal
        return pending.promise
      }),
    )

    unmount()
    expect(captured?.aborted).toBe(true)
    await act(async () => pending.reject(new ApiError({ kind: 'canceled' })))
    expect(result.current.error).toBeUndefined()
  })
})
