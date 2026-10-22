import { useEffect, useState } from 'react'
import { streamLivePrices } from '@/services/liveService'
import type { LivePoint } from '@/types/market'

export type LiveStatus = 'connecting' | 'live' | 'reconnecting'

/** Lo mismo que guarda el backend: los ultimos 15 minutos. */
const MAX_POINTS = 900

/** Precio segundo a segundo de una cripto. Si el stream se corta, reconecta con espera creciente. */
export function useLivePrices(assetId: number | null, enabled: boolean) {
  const [points, setPoints] = useState<LivePoint[]>([])
  const [status, setStatus] = useState<LiveStatus>('connecting')

  useEffect(() => {
    if (!assetId || !enabled) return
    const controller = new AbortController()
    let attempt = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      streamLivePrices(
        assetId,
        {
          onHistory: (history) => {
            attempt = 0
            setStatus('live')
            setPoints(history.slice(-MAX_POINTS))
          },
          onTick: (point) => setPoints((prev) => [...prev.slice(1 - MAX_POINTS), point]),
        },
        controller.signal,
      )
        .catch(() => undefined)
        .finally(() => {
          if (controller.signal.aborted) return
          setStatus('reconnecting')
          timer = setTimeout(connect, Math.min(15_000, 2_000 * 2 ** attempt++))
        })
    }
    connect()

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [assetId, enabled])

  return { points, status }
}
