import { http } from '@/api/client'
import type { Asset } from '@/types/market'

/** Los favoritos del mercado. PUT y DELETE son idempotentes: la estrella es un interruptor. */
export const watchlistService = {
  async list(signal?: AbortSignal): Promise<Asset[]> {
    const { data } = await http.get<Asset[]>('/watchlist', { signal })
    return data
  },

  async add(assetId: number): Promise<void> {
    await http.put(`/watchlist/${assetId}`)
  },

  async remove(assetId: number): Promise<void> {
    await http.delete(`/watchlist/${assetId}`)
  },
}
