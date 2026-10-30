import { http } from '@/api/client'
import type { UpDownCase, UpDownCaseInput, UpDownPreview } from '@/types/updownCases'

/** El banco de casos de "¿Sube o baja?"; todo es de ADMIN. */
export const updownCaseService = {
  async list(signal?: AbortSignal): Promise<UpDownCase[]> {
    const { data } = await http.get<UpDownCase[]>('/updown-cases', { signal })
    return data
  },

  /** Que paso de verdad con ese activo el mes siguiente, antes de guardar. */
  async preview(symbol: string, cutoff: string): Promise<UpDownPreview> {
    const { data } = await http.get<UpDownPreview>('/updown-cases/preview', { params: { symbol, cutoff } })
    return data
  },

  async create(input: UpDownCaseInput): Promise<UpDownCase> {
    const { data } = await http.post<UpDownCase>('/updown-cases', input)
    return data
  },

  async update(id: number, input: UpDownCaseInput): Promise<UpDownCase> {
    const { data } = await http.put<UpDownCase>(`/updown-cases/${id}`, input)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/updown-cases/${id}`)
  },
}
