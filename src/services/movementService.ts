import { http } from '@/api/client'
import { compactParams } from '@/api/params'
import { monthRange } from '@/lib/monthOverview'
import type { PageParams, PageResponse } from '@/types/api'
import type { MonthlyFlows, Movement, MovementFilters } from '@/types/movements'

const MONTH_PAGE = 500
const MONTH_MAX_PAGES = 10

/** Ingresos y gastos juntos, solo lectura. Crear, editar y borrar va por sus propios servicios. */
export const movementService = {
  async list(params: PageParams & MovementFilters, signal?: AbortSignal): Promise<PageResponse<Movement>> {
    const { data } = await http.get<PageResponse<Movement>>('/movements', { params: compactParams(params), signal })
    return data
  },

  /** Todos los movimientos de un mes (yyyy-MM), para el mapa de calor y la dona. */
  async month(month: string, signal?: AbortSignal): Promise<Movement[]> {
    const range = monthRange(month)
    const movements: Movement[] = []
    for (let page = 0; page < MONTH_MAX_PAGES; page++) {
      const data = await movementService.list({ ...range, page, size: MONTH_PAGE, sort: 'date,desc' }, signal)
      movements.push(...data.content)
      if (page + 1 >= data.totalPages) break
    }
    return movements
  },

  /** Totales por mes hasta el mes en curso. Sin `months`, desde el primer movimiento. */
  async monthly(months: number | undefined, signal?: AbortSignal): Promise<MonthlyFlows> {
    const { data } = await http.get<MonthlyFlows>('/movements/monthly', { params: compactParams({ months }), signal })
    return data
  },
}
