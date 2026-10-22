import type { LivePoint } from '@/types/market'
import { streamEvents } from './eventStream'

interface LiveHandlers {
  onHistory: (points: LivePoint[]) => void
  onTick: (point: LivePoint) => void
}

/** Precio de una cripto segundo a segundo, hasta que se corte o se aborte. */
export function streamLivePrices(assetId: number, handlers: LiveHandlers, signal: AbortSignal) {
  return streamEvents(
    `/assets/${assetId}/live`,
    ({ event, data }) => {
      if (event === 'history') handlers.onHistory(JSON.parse(data) as LivePoint[])
      else if (event === 'tick') handlers.onTick(JSON.parse(data) as LivePoint)
    },
    signal,
  )
}
