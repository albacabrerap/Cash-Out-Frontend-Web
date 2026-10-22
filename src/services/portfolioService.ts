import { http } from '@/api/client'
import type { PageParams, PageResponse } from '@/types/api'
import type { Portfolio, TradeOrder, TradeOrderInput } from '@/types/market'

const PAGE_SIZE = 200
const MAX_PAGES = 10

export const portfolioService = {
  /** El portafolio valorado; el backend refresca antes los precios de las posiciones. */
  async get(signal?: AbortSignal): Promise<Portfolio> {
    const { data } = await http.get<Portfolio>('/portfolio', { signal })
    return data
  },

  async listOrders(params: PageParams, signal?: AbortSignal): Promise<PageResponse<TradeOrder>> {
    const { data } = await http.get<PageResponse<TradeOrder>>('/orders', { params, signal })
    return data
  },

  /** Todas las ordenes, de la mas antigua a la mas reciente, para rearmar la historia del portafolio. */
  async allOrders(signal?: AbortSignal): Promise<TradeOrder[]> {
    const orders: TradeOrder[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await portfolioService.listOrders({ page, size: PAGE_SIZE, sort: 'createdAt,asc' }, signal)
      orders.push(...data.content)
      if (page + 1 >= data.totalPages) break
    }
    return orders
  },

  /**
   * Una orden rechazada (sin fichas, sin acciones) no es un error HTTP: vuelve
   * con status REJECTED y su motivo. Hay que mirar el status de la respuesta.
   */
  async placeOrder(input: TradeOrderInput): Promise<TradeOrder> {
    const { data } = await http.post<TradeOrder>('/orders', input)
    return data
  },
}
