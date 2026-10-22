import { http } from '@/api/client'
import { compactParams } from '@/api/params'
import type { PageParams, PageResponse } from '@/types/api'
import type { Expense, ExpenseFilters, ExpenseInput } from '@/types/movements'

export const expenseService = {
  async list(params: PageParams & ExpenseFilters, signal?: AbortSignal): Promise<PageResponse<Expense>> {
    const { data } = await http.get<PageResponse<Expense>>('/expenses', { params: compactParams(params), signal })
    return data
  },

  async get(id: number, signal?: AbortSignal): Promise<Expense> {
    const { data } = await http.get<Expense>(`/expenses/${id}`, { signal })
    return data
  },

  async create(input: ExpenseInput): Promise<Expense> {
    const { data } = await http.post<Expense>('/expenses', input)
    return data
  },

  async update(id: number, input: ExpenseInput): Promise<Expense> {
    const { data } = await http.put<Expense>(`/expenses/${id}`, input)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/expenses/${id}`)
  },
}
