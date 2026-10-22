import { useEffect, useEffectEvent } from 'react'

/**
 * Ejecuta `callback` cada `intervalMs` mientras la pestana este visible.
 *
 * En segundo plano se detiene: un precio que nadie esta mirando no justifica
 * pedidos al proveedor, que limita la cuenta gratuita por minuto. Al volver a
 * la pestana se ejecuta de inmediato, para no mostrar un precio viejo.
 */
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const tick = useEffectEvent(callback)

  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setInterval> | undefined

    const start = () => {
      clearInterval(timer)
      timer = setInterval(() => tick(), intervalMs)
    }
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(timer)
      } else {
        tick()
        start()
      }
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs, enabled])
}
