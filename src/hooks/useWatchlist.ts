import { useState } from 'react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { watchlistService } from '@/services/watchlistService'
import type { Asset } from '@/types/market'

/**
 * Los favoritos del usuario. La estrella cambia al instante y se corrige si el
 * backend falla. Lo elegido se queda encima de la lista del backend: asi no
 * parpadea mientras la recarga llega.
 */
export function useWatchlist() {
  const query = useApiQuery(['watchlist'], (signal) => watchlistService.list(signal))
  const [pending, setPending] = useState<Map<number, Asset | null>>(new Map())

  const settle = (id: number) =>
    setPending((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })

  const base = query.data ?? []
  const assets = [
    ...[...pending.values()].filter((asset): asset is Asset => asset !== null && !base.some((item) => item.id === asset.id)),
    ...base.filter((asset) => pending.get(asset.id) !== null),
  ]
  const isFavorite = (id: number) => assets.some((asset) => asset.id === id)

  const toggle = async (asset: Asset) => {
    const adding = !isFavorite(asset.id)
    setPending((prev) => new Map(prev).set(asset.id, adding ? asset : null))
    try {
      await (adding ? watchlistService.add(asset.id) : watchlistService.remove(asset.id))
      toast.success(adding ? `${asset.symbol} está en tus favoritos` : `Quitaste ${asset.symbol} de tus favoritos`)
      query.reload()
    } catch (err) {
      settle(asset.id)
      toast.error(userMessage(toApiError(err)))
    }
  }

  return {
    assets: query.data ? assets : undefined,
    error: query.error,
    reload: query.reload,
    isFavorite,
    toggle,
  }
}
