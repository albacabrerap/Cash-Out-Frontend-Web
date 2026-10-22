import { http } from '@/api/client'
import type { PageParams, PageResponse } from '@/types/api'
import type { TokenTransaction, TokenWallet } from '@/types/finance'

/** Billetera de fichas del usuario autenticado. */
export const walletService = {
  async get(signal?: AbortSignal): Promise<TokenWallet> {
    const { data } = await http.get<TokenWallet>('/token-wallet', { signal })
    return data
  },

  /** Movimientos de fichas, del mas reciente al mas antiguo. */
  async transactions(params: PageParams, signal?: AbortSignal): Promise<PageResponse<TokenTransaction>> {
    const { data } = await http.get<PageResponse<TokenTransaction>>('/token-wallet/transactions', { params, signal })
    return data
  },

  /** Los movimientos desde una fecha (yyyy-MM-dd), mas uno anterior para saber con cuanto se empezo. */
  async transactionsSince(date: string, signal?: AbortSignal): Promise<TokenTransaction[]> {
    const found: TokenTransaction[] = []
    for (let page = 0; page < 10; page++) {
      const data = await walletService.transactions({ page, size: 100, sort: 'createdAt,desc' }, signal)
      found.push(...data.content)
      const oldest = data.content.at(-1)
      if (page + 1 >= data.totalPages || (oldest && oldest.createdAt.slice(0, 10) < date)) break
    }
    return found
  },
}
