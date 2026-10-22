import { http } from '@/api/client'
import type { Contribution, ContributionInput, SavingsGoal, SavingsGoalInput } from '@/types/goals'

export const goalService = {
  /** Todas las metas, ordenadas por fecha limite. El backend no las pagina. */
  async list(signal?: AbortSignal): Promise<SavingsGoal[]> {
    const { data } = await http.get<SavingsGoal[]>('/savings-goals', { signal })
    return data
  },

  async get(id: number, signal?: AbortSignal): Promise<SavingsGoal> {
    const { data } = await http.get<SavingsGoal>(`/savings-goals/${id}`, { signal })
    return data
  },

  async create(input: SavingsGoalInput): Promise<SavingsGoal> {
    const { data } = await http.post<SavingsGoal>('/savings-goals', input)
    return data
  },

  async update(id: number, input: SavingsGoalInput): Promise<SavingsGoal> {
    const { data } = await http.put<SavingsGoal>(`/savings-goals/${id}`, input)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/savings-goals/${id}`)
  },

  /** Del mas reciente al mas antiguo. */
  async contributions(goalId: number, signal?: AbortSignal): Promise<Contribution[]> {
    const { data } = await http.get<Contribution[]>(`/savings-goals/${goalId}/contributions`, { signal })
    return data
  },

  async contribute(goalId: number, input: ContributionInput): Promise<Contribution> {
    const { data } = await http.post<Contribution>(`/savings-goals/${goalId}/contributions`, input)
    return data
  },
}
