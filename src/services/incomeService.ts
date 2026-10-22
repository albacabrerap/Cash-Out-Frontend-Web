import { http } from '@/api/client'
import { compactParams } from '@/api/params'
import type { PageParams, PageResponse } from '@/types/api'
import type { Income, IncomeInput, MovementFilters } from '@/types/movements'

export const incomeService = {
  async list(params: PageParams & MovementFilters, signal?: AbortSignal): Promise<PageResponse<Income>> {
    const { data } = await http.get<PageResponse<Income>>('/incomes', { params: compactParams(params), signal })
    return data
  },

  async get(id: number, signal?: AbortSignal): Promise<Income> {
    const { data } = await http.get<Income>(`/incomes/${id}`, { signal })
    return data
  },

  async create(input: IncomeInput): Promise<Income> {
    const { data } = await http.post<Income>('/incomes', input)
    return data
  },

  async update(id: number, input: IncomeInput): Promise<Income> {
    const { data } = await http.put<Income>(`/incomes/${id}`, input)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/incomes/${id}`)
  },
}
