import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/api/errors'
import { mergeRaceView } from '@/lib/race'
import { streamEvents } from '@/services/eventStream'
import type { RaceView } from '@/types/race'

export type RaceConnection = 'connecting' | 'live' | 'reconnecting' | 'missing'

/**
 * La sala en vivo. Escucha el SSE de la carrera y reconecta si se corta;
 * `apply` mezcla tambien lo que devuelven las acciones (entrar, comprar…),
 * para no esperar al siguiente tick.
 */
export function useRaceRoom(code: string) {
  const [view, setView] = useState<RaceView | null>(null)
  const [connection, setConnection] = useState<RaceConnection>('connecting')

  const apply = useCallback((next: RaceView) => setView((prev) => mergeRaceView(prev, next)), [])

  useEffect(() => {
    const controller = new AbortController()
    let attempt = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      streamEvents(
        `/race-rooms/${code}/events`,
        ({ data }) => {
          attempt = 0
          setConnection('live')
          apply(JSON.parse(data) as RaceView)
        },
        controller.signal,
      )
        .then(() => {
          if (controller.signal.aborted) return
          setConnection('reconnecting')
          timer = setTimeout(connect, 2_000)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          // Una sala cancelada o vencida ya no existe: no tiene sentido reintentar.
          if (error instanceof ApiError && error.status === 404) {
            setConnection('missing')
            return
          }
          setConnection('reconnecting')
          timer = setTimeout(connect, Math.min(15_000, 2_000 * 2 ** attempt++))
        })
    }
    connect()

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [code, apply])

  return { view, connection, apply }
}
