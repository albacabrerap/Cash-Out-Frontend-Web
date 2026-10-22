import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

/** Ejecuta `callback` cuando pasan `delay` ms sin llamadas nuevas. `flush` lo adelanta. */
export function useDebouncedCallback<A extends unknown[]>(callback: (...args: A) => void, delay: number) {
  const callbackRef = useRef(callback)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingArgs = useRef<A | null>(null)

  useLayoutEffect(() => {
    callbackRef.current = callback
  })

  useEffect(() => () => clearTimeout(timer.current), [])

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    if (pendingArgs.current) {
      const args = pendingArgs.current
      pendingArgs.current = null
      callbackRef.current(...args)
    }
  }, [])

  const debounced = useCallback(
    (...args: A) => {
      pendingArgs.current = args
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, delay)
    },
    [delay, flush],
  )

  return { debounced, flush }
}
