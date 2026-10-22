import { http } from '@/api/client'
import type { Projection, ProjectionInput, ProjectionOutcome, ProjectionParams } from '@/types/projections'

export const projectionService = {
  /** Del mas reciente al mas antiguo. El backend no las pagina. */
  async list(signal?: AbortSignal): Promise<Projection[]> {
    const { data } = await http.get<Projection[]>('/projections', { signal })
    return data
  },

  /** Calcula sin guardar: la calculadora muestra lo mismo que despues se guarda. */
  async preview(params: ProjectionParams, signal?: AbortSignal): Promise<ProjectionOutcome> {
    const { data } = await http.get<ProjectionOutcome>('/projections/preview', { params, signal })
    return data
  },

  async create(input: ProjectionInput): Promise<Projection> {
    const { data } = await http.post<Projection>('/projections', input)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/projections/${id}`)
  },
}
