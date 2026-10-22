import { http } from '@/api/client'
import type { Savings } from '@/types/finance'

/** Ahorro del usuario autenticado. Es un recurso singular: no lleva id. */
export const savingsService = {
  async get(signal?: AbortSignal): Promise<Savings> {
    const { data } = await http.get<Savings>('/savings', { signal })
    return data
  },
}
